'use strict';
const { body } = require('express-validator');
const Property = require('../models/Property');
const Seller = require('../models/Seller');
const { generateId } = require('../utils/generateId');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const propertyValidation = [
  body('propertyType')
    .notEmpty()
    .withMessage('Property type is required')
    .isIn([
      'Land', 'Independent House', 'Apartment/Flat', 'Commercial Property',
      'Agricultural Land', 'Industrial Property', 'Rental Property', 'Lease Property',
    ])
    .withMessage('Invalid property type'),
  body('propertyTitle').trim().notEmpty().withMessage('Property title is required'),
  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
    .isIn(['Sale', 'Rent', 'Lease'])
    .withMessage('Purpose must be Sale, Rent, or Lease'),
  body('ownerName').optional().trim(),
  body('contactNumber').optional().trim(),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/properties
 * Get all properties with filters and pagination.
 */
const getAllProperties = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10, status, type, purpose,
      location, minPrice, maxPrice, bhk, parking,
    } = req.query;

    const filter = { createdBy: req.user._id };

    if (status) filter.propertyStatus = status;
    if (type) filter.propertyType = type;
    if (purpose) filter.purpose = purpose;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (bhk) filter.bhk = Number(bhk);
    if (parking !== undefined) filter.parkingAvailable = parking === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Properties fetched successfully',
      data: properties,
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
        { $match: { createdBy: req.user._id } },
        { $group: { _id: '$propertyStatus', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Property.aggregate([
        { $match: { createdBy: req.user._id } },
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
      $and: [
        { $or: [{ propertyId: id }, { _id: id.match(/^[a-f\d]{24}$/i) ? id : null }] },
        { createdBy: req.user._id }
      ]
    });

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
 */
const createProperty = async (req, res, next) => {
  try {
    const propertyId = generateId('PROP');
    let propertyData = { ...req.body, propertyId, createdBy: req.user._id };
    
    let seller = null;

    if (req.body.sellerId) {
      // Existing seller
      seller = await Seller.findOne({ _id: req.body.sellerId, createdBy: req.user._id });
      if (!seller) {
        return res.status(404).json({ success: false, message: 'Seller not found' });
      }
      propertyData.ownerName = propertyData.ownerName || seller.sellerName;
      propertyData.contactNumber = propertyData.contactNumber || seller.contactNumber;
    } else if (req.body.newSeller) {
      // Create new seller
      const sellerIdGen = generateId('SEL');
      seller = await Seller.create({
        ...req.body.newSeller,
        sellerId: sellerIdGen,
        createdBy: req.user._id,
      });
      propertyData.ownerName = propertyData.ownerName || seller.sellerName;
      propertyData.contactNumber = propertyData.contactNumber || seller.contactNumber;
    }

    if (!propertyData.ownerName || !propertyData.contactNumber) {
       return res.status(400).json({ success: false, message: 'ownerName and contactNumber are required if not providing a seller' });
    }

    const property = await Property.create(propertyData);

    if (seller) {
      seller.propertiesLinked.push(property._id);
      await seller.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property,
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

    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      {
      new: true,
      runValidators: true,
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: property,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/properties/:id
 * Delete a property.
 */
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
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
    const validStatuses = ['Available', 'Sold', 'Rented', 'Leased'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
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

module.exports = {
  getAllProperties,
  getPropertyStats,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  propertyValidation,
};
