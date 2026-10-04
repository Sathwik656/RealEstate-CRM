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
const { sanitizePropertiesForUser } = require('../utils/propertyHelper');
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
 * Build the base filter for property queries.
 * Applies all field-level filters (status, type, price, area, etc.)
 */
const buildPropertyFilter = async (req) => {
  const {
    status, type, purpose,
    location, locationCode, minPrice, maxPrice, bhk, parking,
  } = req.query;

  let filter = {};

  if (status) {
    filter.propertyStatus = status;
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

  const { minArea, maxArea } = req.query;
  if (minArea || maxArea) {
    filter.area = {};
    if (minArea) filter.area.$gte = Number(minArea);
    if (maxArea) filter.area.$lte = Number(maxArea);
  }

  return filter;
};

/**
 * GET /api/properties
 * Get all properties with filters and pagination.
 * - Admin: sees all properties (approved + pending)
 * - Agent: sees only approved properties + their own pending ones
 */
const getAllProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filter = await buildPropertyFilter(req);

    // ── Visibility filter ─────────────────────────────────────────────────────
    if (req.user.role === 'agent') {
      // Agents see: all approved properties OR their own pending ones
      filter.$or = [
        { approvalStatus: 'approved' },
        { approvalStatus: 'pending', createdByUserId: req.user._id },
      ];
    }
    // Admins see everything (no extra filter)

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('referredByAgentId', 'name code')
      .populate('createdByUserId', 'name code role')
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

    propertiesData = await sanitizePropertiesForUser(propertiesData, req.user);

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
 * GET /api/properties/my
 * Get all properties created by the currently logged-in agent (regardless of approvalStatus).
 * Admin gets all properties.
 */
const getMyProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 10000 } = req.query;
    const filter = req.user.role === 'admin'
      ? {}
      : { createdByUserId: req.user._id };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('referredByAgentId', 'name code')
      .populate('createdByUserId', 'name code role')
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber');

    const sanitizedData = await sanitizePropertiesForUser(properties, req.user);

    return res.status(200).json({
      success: true,
      message: 'My properties fetched successfully',
      data: sanitizedData,
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
    // Stats only count approved properties for agents
    const matchFilter = req.user.role === 'agent'
      ? { $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] }
      : {};

    const [statusStats, typeStats] = await Promise.all([
      Property.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$propertyStatus', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Property.aggregate([
        { $match: matchFilter },
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
 * Agents cannot access pending properties they did not create.
 */
const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findOne({
      $or: [{ propertyId: id }, { code: id }, { _id: id.match(/^[a-f\d]{24}$/i) ? id : null }]
    })
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber address note')
      .populate('referredByAgentId', 'name code')
      .populate('createdByUserId', 'name code role');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Agents cannot view pending properties created by other agents
    if (
      req.user.role === 'agent' &&
      property.approvalStatus === 'pending' &&
      property.createdByUserId?.toString() !== req.user._id.toString()
    ) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const sanitizedData = await sanitizePropertiesForUser(property, req.user);

    return res.status(200).json({
      success: true,
      message: 'Property fetched successfully',
      data: sanitizedData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/properties
 * Create a new property.
 * - Admin: property is immediately approved and all agents are notified.
 * - Agent: property goes to 'pending' approval; admins are notified to review.
 */
const createProperty = async (req, res, next) => {
  try {
    const propertyId = generateId('PROP');
    let propertyData = { ...req.body, propertyId };

    const locDoc = await LocationCode.findById(req.body.location);
    if (!locDoc) {
      return res.status(400).json({ success: false, message: 'Invalid location selected' });
    }
    const code = await generateEntityCode('Property', locDoc.code);
    propertyData.code = code;

    // Always stamp the creator
    propertyData.createdByUserId = req.user._id;

    if (req.user.role === 'agent') {
      // Agent-created properties require admin approval
      propertyData.approvalStatus = 'pending';
      // Agent is the referring agent for their own property
      propertyData.referredByAgentId = req.user._id;
    } else {
      // Admin-created properties are immediately approved
      propertyData.approvalStatus = 'approved';
    }

    let seller = null;

    if (req.body.sellerId) {
      // Existing seller — verify it exists
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
      const sellerCode = await generateEntityCode('Seller');
      const newSellerData = {
        ...req.body.newSeller,
        sellerId: sellerIdGen,
        code: sellerCode,
        createdByUserId: req.user._id,
      };
      // If agent creates inline seller, auto-own it
      if (req.user.role === 'agent') {
        newSellerData.referredByAgentId = req.user._id;
      }
      seller = await Seller.create(newSellerData);
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

    const populatedProperty = await Property.findById(property._id)
      .populate('location')
      .populate('createdByUserId', 'name code role');

    const { notifyAllEligibleAgents, notifyAdminsPendingProperty } = require('../services/pushNotificationService');

    if (req.user.role === 'agent') {
      // Notify admins that a property is awaiting their review (fire-and-forget)
      notifyAdminsPendingProperty(populatedProperty, req.user).catch(err => {
        console.error('Push notification error (pending property):', err);
      });
    } else {
      // Notify all eligible agents of the new approved property (existing behaviour)
      notifyAllEligibleAgents(populatedProperty, req.user._id).catch(err => {
        console.error('Push notification error:', err);
      });
    }

    return res.status(201).json({
      success: true,
      message: req.user.role === 'agent'
        ? 'Property submitted for approval. Admin will review it shortly.'
        : 'Property created successfully',
      data: populatedProperty,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/properties/:id/approve
 * Admin-only: approve a pending property.
 * After approval the property becomes visible to all agents and notifications are sent.
 */
const approveProperty = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can approve properties' });
    }

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved' },
      { new: true }
    )
      .populate('location')
      .populate('createdByUserId', 'name code role _id');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const { notifyAllEligibleAgents, notifyAgentPropertyApproved } = require('../services/pushNotificationService');

    // Notify all agents about the newly available property
    notifyAllEligibleAgents(property, req.user._id).catch(err => {
      console.error('Push notification error (property approved):', err);
    });

    // Notify the creating agent specifically that their submission was approved
    if (property.createdByUserId && property.createdByUserId.role === 'agent') {
      notifyAgentPropertyApproved(property, property.createdByUserId._id).catch(err => {
        console.error('Push notification error (agent approved):', err);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Property approved successfully',
      data: property,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/properties/:id
 * Update a property.
 * Agents can update properties they created (by createdByUserId) or are referred agent of.
 */
const updateProperty = async (req, res, next) => {
  try {
    // Prevent overriding the auto-generated propertyId
    delete req.body.propertyId;
    // Agents cannot change approvalStatus via this endpoint
    if (req.user.role === 'agent') {
      delete req.body.approvalStatus;
    }

    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : {
          _id: req.params.id,
          $or: [
            { referredByAgentId: req.user._id },
            { createdByUserId: req.user._id },
          ],
        };

    const oldProperty = await Property.findOne(filter);
    if (!oldProperty) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (req.body.location && req.body.location !== oldProperty.location?.toString()) {
      const locDoc = await LocationCode.findById(req.body.location);
      if (locDoc) {
        req.body.code = reconstructPropertyCode(oldProperty.code, locDoc.code);
      }
    }

    // Delete removed images from Cloudinary
    if (req.body.images && oldProperty.images && oldProperty.images.length > 0) {
      const cloudinary = require('../config/cloudinary');
      const newPublicIds = req.body.images.map(img => img.publicId);
      for (const img of oldProperty.images) {
        if (img.publicId && !newPublicIds.includes(img.publicId)) {
          cloudinary.uploader.destroy(img.publicId).catch(console.error);
        }
      }
    }

    // Apply the update
    const updatedProperty = await Property.findByIdAndUpdate(
      oldProperty._id,
      { $set: req.body },
      { new: true }
    ).populate('referredByAgentId', 'name code').populate('location');

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
 * Agents can only delete properties they created (pending ones).
 */
const deleteProperty = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : {
          _id: req.params.id,
          $or: [
            { referredByAgentId: req.user._id },
            { createdByUserId: req.user._id },
          ],
        };

    const property = await Property.findOneAndDelete(filter);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Clean up junction records
    await SellerProperty.deleteMany({ propertyId: property._id });

    // Clean up cloudinary images
    if (property.images && property.images.length > 0) {
      const cloudinary = require('../config/cloudinary');
      for (const img of property.images) {
        if (img.publicId) {
          cloudinary.uploader.destroy(img.publicId).catch(console.error);
        }
      }
    }

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
      : {
          _id: req.params.id,
          $or: [
            { referredByAgentId: req.user._id },
            { createdByUserId: req.user._id },
          ],
        };

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

    // Apply visibility filter for export too
    if (req.user.role === 'agent') {
      filter.$or = [
        { approvalStatus: 'approved' },
        { approvalStatus: 'pending', createdByUserId: req.user._id },
      ];
    }

    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .populate('referredByAgentId', 'name code')
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber');

    const propertiesData = await sanitizePropertiesForUser(properties, req.user);

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Properties');

    worksheet.columns = [
      { header: 'Property Code', key: 'code', width: 20 },
      { header: 'Property Title', key: 'propertyTitle', width: 30 },
      { header: 'Type', key: 'propertyType', width: 15 },
      { header: 'Purpose', key: 'purpose', width: 10 },
      { header: 'Status', key: 'propertyStatus', width: 15 },
      { header: 'Approval', key: 'approvalStatus', width: 12 },
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

    propertiesData.forEach(p => {
      worksheet.addRow({
        code: p.code || '',
        propertyTitle: p.propertyTitle || '',
        propertyType: p.propertyType || '',
        purpose: p.purpose || '',
        propertyStatus: p.propertyStatus || '',
        approvalStatus: p.approvalStatus || 'approved',
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

// ─── Get Property Interests ──────────────────────────────────────────
const getPropertyInterests = async (req, res, next) => {
  try {
    const PropertyInterest = require('../models/PropertyInterest');
    const interests = await PropertyInterest.find({ propertyId: req.params.id })
      .populate('agentId', 'name code phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: interests,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProperties,
  getMyProperties,
  exportProperties,
  getPropertyStats,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  approveProperty,
  propertyValidation,
  getPropertyInterests,
};
