'use strict';
const { body } = require('express-validator');
const Property = require('../models/Property');
const Seller = require('../models/Seller');
const SellerProperty = require('../models/SellerProperty');
const LocationCode = require('../models/LocationCode');
const Deal = require('../models/Deal');
const PropertyInterest = require('../models/PropertyInterest');
const { generateId } = require('../utils/generateId');
const { generateEntityCode, reconstructPropertyCode } = require('../utils/generateCode');
const exceljs = require('exceljs');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const propertyValidation = [
  body('propertyType')
    .notEmpty()
    .withMessage('Property type is required')
    .isIn([
      'Land', 'Shop', 'Independent House', 'Flat', 'Store', 'Garage'
    ])
    .withMessage('Invalid property type'),
  body('propertyTitle').trim().notEmpty().withMessage('Property title is required'),
  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
    .isIn(['Sale', 'Rent'])
    .withMessage('Purpose must be Sale or Rent'),
  body('contactNumber').optional().trim(),
  body('yearOfConstruction').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid date format for yearOfConstruction'),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/properties
 * Get all properties with filters and pagination.
 */
const buildPropertyFilter = async (req) => {
  const {
    status, type, purpose,
    location, locationCode, minPrice, maxPrice, bhk, parking,
  } = req.query;

  let filter = {};

  if (req.user.role === 'agent') {
    const agentDeals = await Deal.find({ agentId: req.user._id, status: { $in: ['ongoing', 'pending_approval'] } }).select('propertyId');
    const inDealPropertyIds = agentDeals.map(d => d.propertyId);
    filter.$or = [
      { propertyStatus: { $in: ['Available', 'In Allotment'] } },
      { _id: { $in: inDealPropertyIds }, propertyStatus: 'In Deal' },
    ];
  }

  if (status) {
    if (req.user.role === 'agent') {
      delete filter.$or;
      if (status === 'Available') {
        filter.propertyStatus = { $in: ['Available', 'In Allotment'] };
      } else if (status === 'In Deal') {
        const agentDeals = await Deal.find({ agentId: req.user._id, status: { $in: ['ongoing', 'pending_approval'] } }).select('propertyId');
        filter._id = { $in: agentDeals.map(d => d.propertyId) };
        filter.propertyStatus = 'In Deal';
      } else {
        filter.propertyStatus = status;
      }
    } else {
      filter.propertyStatus = status;
    }
  }

  if (type) filter.propertyType = type;
  if (purpose) filter.purpose = purpose;
  
  if (location) {
    const locDocs = await LocationCode.find({
      $or: [
        { location: { $regex: location, $options: 'i' } },
        { code: { $regex: location, $options: 'i' } }
      ]
    }).select('_id');
    filter.location = { $in: locDocs.map(d => d._id) };
  }
  
  if (locationCode) {
    const locDocs = await LocationCode.find({ code: locationCode.toUpperCase() }).select('_id');
    filter.location = { $in: locDocs.map(d => d._id) };
  }
  
  if (bhk) filter.bhk = Number(bhk);
  if (parking !== undefined) filter.parkingAvailable = parking === 'true';
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  return filter;
};

/**
 * GET /api/properties
 * Get all properties with filters and pagination.
 */
const getAllProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filter = await buildPropertyFilter(req);

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('referredByAgentId', 'name email')
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber address note');

    let propertiesData = properties.map(p => p.toJSON());

    if (req.user.role === 'agent') {
      const interests = await PropertyInterest.find({
        agentId: req.user._id,
        propertyId: { $in: propertiesData.map(p => p._id) }
      });
      const interestedIds = new Set(interests.map(i => i.propertyId.toString()));
      propertiesData = propertiesData.map(p => ({
        ...p,
        isApplied: interestedIds.has(p._id.toString())
      }));
    }

    return res.status(200).json({
      success: true,
      message: 'Properties fetched successfully',
      data: propertiesData,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/properties/stats
 * Get property counts by status and type.
 */
const getPropertyStats = async (req, res, next) => {
  try {
    const [statusStats, typeStats] = await Promise.all([
      Property.aggregate([
        { $match: {} },
        { $group: { _id: '$propertyStatus', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Property.aggregate([
        { $match: {} },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const byStatus = {};
    statusStats.forEach((s) => { byStatus[s._id] = s.count; });

    const byType = {};
    typeStats.forEach((t) => { byType[t._id] = t.count; });

    return res.status(200).json({
      success: true,
      message: 'Property stats fetched successfully',
      data: { byStatus, byType },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/properties/:id
 * Get a single property by propertyId or _id.
 */
const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findOne({
      $or: [{ propertyId: id }, { _id: id.match(/^[a-f\d]{24}$/i) ? id : null }]
    })
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber address note')
      .populate('referredByAgentId', 'name email');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Property fetched successfully',
      data: property,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/properties
 * Create a new property.
 * Admin can set referredByAgentId to indicate which agent referred this property.
 * If sellerId is provided, also creates a SellerProperty junction record.
 */
const createProperty = async (req, res, next) => {
  try {
    const propertyId = generateId('PROP');
    let propertyData = { ...req.body, propertyId };

    const locDoc = await LocationCode.findById(req.body.location);
    if (!locDoc) {
      return res.status(400).json({ success: false, message: 'Invalid location selected' });
    }
    const { code, seqNumber } = await generateEntityCode('Property', locDoc.code);
    propertyData.code = code;
    propertyData.seqNumber = seqNumber;

    if (req.user.role === 'admin') {
      propertyData.createdByUserId = req.user._id;
    }

    let seller = null;

    if (req.body.sellerId) {
      // Existing seller — verify ownership
      seller = await Seller.findById(req.body.sellerId);
      if (!seller) {
        return res.status(404).json({ success: false, message: 'Seller not found' });
      }
      // Use seller contact if not explicitly provided
      if (!propertyData.contactNumber) {
        propertyData.contactNumber = seller.contactNumber;
      }
      propertyData.sellerId = seller._id;
    } else if (req.body.newSeller) {
      // Create new seller inline
      const sellerIdGen = generateId('SEL');
      const { code: sellerCode, seqNumber: sellerSeq } = await generateEntityCode('Seller');
      seller = await Seller.create({
        ...req.body.newSeller,
        sellerId: sellerIdGen,
        code: sellerCode,
        seqNumber: sellerSeq,
        createdByUserId: req.user._id,
      });
      if (!propertyData.contactNumber) {
        propertyData.contactNumber = seller.contactNumber;
      }
      propertyData.sellerId = seller._id;
    }

    const property = await Property.create(propertyData);

    // Create SellerProperty junction record when a seller is linked
    if (seller) {
      await SellerProperty.findOneAndUpdate(
        { sellerId: seller._id, propertyId: property._id },
        { sellerId: seller._id, propertyId: property._id },
        { upsert: true, new: true }
      );
    }

    const populatedProperty = await Property.findById(property._id).populate('location');

    // Send push notifications to eligible agents (fire-and-forget)
    const { notifyAllEligibleAgents } = require('../services/pushNotificationService');
    notifyAllEligibleAgents(populatedProperty, req.user._id).catch(err => {
      console.error('Push notification error:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: populatedProperty,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/properties/:id
 * Update a property.
 */
const updateProperty = async (req, res, next) => {
  try {
    // Prevent overriding the auto-generated propertyId
    delete req.body.propertyId;

    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, referredByAgentId: req.user._id };

    const oldProperty = await Property.findOne(filter);
    if (!oldProperty) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (req.body.location && req.body.location !== oldProperty.location?.toString()) {
      const locDoc = await LocationCode.findById(req.body.location);
      if (locDoc) {
        req.body.code = reconstructPropertyCode(oldProperty.seqNumber, locDoc.code);
      }
    }

    // Apply the update
    const updatedProperty = await Property.findByIdAndUpdate(
      oldProperty._id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('referredByAgentId', 'name email').populate('location');

    return res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/properties/:id
 * Delete a property and its SellerProperty junction records.
 */
const deleteProperty = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, referredByAgentId: req.user._id };

    const property = await Property.findOneAndDelete(filter);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Clean up junction records
    await SellerProperty.deleteMany({ propertyId: property._id });

    return res.status(200).json({
      success: true,
      message: 'Property deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/properties/:id/status
 * Update only propertyStatus.
 */
const updatePropertyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Available', 'In Deal', 'Sold'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, referredByAgentId: req.user._id };

    const property = await Property.findOneAndUpdate(
      filter,
      { propertyStatus: status },
      { new: true, runValidators: true }
    );

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Property status updated successfully',
      data: property,
    });
  } catch (err) {
    next(err);
  }
};

const exportProperties = async (req, res, next) => {
  try {
    const filter = await buildPropertyFilter(req);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .populate('referredByAgentId', 'name email')
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber');

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Properties');

    worksheet.columns = [
      { header: 'Property Code', key: 'code', width: 20 },
      { header: 'Property Title', key: 'propertyTitle', width: 30 },
      { header: 'Type', key: 'propertyType', width: 15 },
      { header: 'Purpose', key: 'purpose', width: 10 },
      { header: 'Status', key: 'propertyStatus', width: 15 },
      { header: 'Location', key: 'locationName', width: 20 },
      { header: 'Location Code', key: 'locationCode', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Area', key: 'area', width: 15 },
      { header: 'BHK', key: 'bhk', width: 10 },
      { header: 'Parking', key: 'parking', width: 10 },
      { header: 'Seller/Owner', key: 'sellerName', width: 20 },
      { header: 'Contact', key: 'contact', width: 15 },
      { header: 'Referred By', key: 'referredBy', width: 20 },
      { header: 'Created Date', key: 'createdAt', width: 20 },
    ];

    properties.forEach(p => {
      worksheet.addRow({
        code: p.code || '',
        propertyTitle: p.propertyTitle || '',
        propertyType: p.propertyType || '',
        purpose: p.purpose || '',
        propertyStatus: p.propertyStatus || '',
        locationName: p.location ? p.location.location : '',
        locationCode: p.location ? p.location.code : '',
        address: p.address || '',
        price: p.price || '',
        area: p.area || '',
        bhk: p.bhk || '',
        parking: p.parkingAvailable ? 'Yes' : 'No',
        sellerName: p.sellerId ? p.sellerId.sellerName : (p.ownerName || ''),
        contact: p.sellerId ? p.sellerId.contactNumber : (p.contactNumber || ''),
        referredBy: p.referredByAgentId ? p.referredByAgentId.name : '',
        createdAt: p.createdAt ? p.createdAt.toISOString().split('T')[0] : '',
      });
    });

    const { locationCode, status } = req.query;
    let filename = 'Properties_Export';
    if (locationCode) filename = `Properties_${locationCode.toUpperCase()}`;
    if (status) filename += `_${status}`;
    filename += '.xlsx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProperties,
  exportProperties,
  getPropertyStats,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  propertyValidation,
};
