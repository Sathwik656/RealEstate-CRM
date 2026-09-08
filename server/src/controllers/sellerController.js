'use strict';
const { body } = require('express-validator');
const Seller = require('../models/Seller');
const SellerProperty = require('../models/SellerProperty');
const Property = require('../models/Property');
const { generateId } = require('../utils/generateId');
const { generateEntityCode } = require('../utils/generateCode');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const sellerValidation = [
  body('sellerName').trim().notEmpty().withMessage('Seller name is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
  body('note').optional().trim(),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/sellers
 */
const getAllSellers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter = req.user.role === 'admin' ? {} : { referredByAgentId: req.user._id };

    if (search) {
      filter.$or = [
        { sellerName: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Seller.countDocuments(filter);
    const sellers = await Seller.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('referredByAgentId', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Sellers fetched successfully',
      data: sellers,
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
 * GET /api/sellers/:id
 * Populate linked properties via SellerProperty junction.
 */
const getSellerById = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id };
    const seller = await Seller.findOne(filter)
      .populate('referredByAgentId', 'name email');

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Fetch linked properties through the SellerProperty junction
    const links = await SellerProperty.find({ sellerId: seller._id }).populate('propertyId');
    const propertiesLinked = links.map((l) => l.propertyId).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: 'Seller fetched successfully',
      data: { ...seller.toObject(), propertiesLinked },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/sellers
 * Admin can set referredByAgentId to indicate which agent referred this seller.
 */
const createSeller = async (req, res, next) => {
  try {
    const sellerId = generateId('SEL');
    const { code, seqNumber } = await generateEntityCode('Seller');
    const sellerData = {
      ...req.body,
      sellerId,
      code,
      seqNumber,
      createdByUserId: req.user._id,
    };
    if (req.user.role !== 'admin') {
      sellerData.referredByAgentId = req.user._id;
    }

    const seller = await Seller.create(sellerData);

    return res.status(201).json({
      success: true,
      message: 'Seller created successfully',
      data: seller,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/sellers/:id
 */
const updateSeller = async (req, res, next) => {
  try {
    delete req.body.sellerId;

    const seller = await Seller.findOneAndUpdate(
      req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Seller updated successfully',
      data: seller,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/sellers/:id
 * Also removes all SellerProperty junction records for this seller.
 */
const deleteSeller = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id };
    const seller = await Seller.findOneAndDelete(filter);

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Clean up junction records
    await SellerProperty.deleteMany({ sellerId: seller._id });

    return res.status(200).json({
      success: true,
      message: 'Seller deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/sellers/:id/link-property
 * Link a property to a seller via the SellerProperty junction.
 */
const linkProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'propertyId is required' });
    }

    const [seller, property] = await Promise.all([
      req.user.role === 'admin' ? Seller.findOne({ _id: req.params.id }) : Seller.findOne({ _id: req.params.id, referredByAgentId: req.user._id }),
      Property.findOne({ _id: propertyId }),
    ]);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Upsert the junction record (prevents duplicates)
    await SellerProperty.findOneAndUpdate(
      { sellerId: seller._id, propertyId: property._id },
      { sellerId: seller._id, propertyId: property._id },
      { upsert: true, new: true }
    );

    // Return seller with populated linked properties
    const links = await SellerProperty.find({ sellerId: seller._id }).populate('propertyId');
    const propertiesLinked = links.map((l) => l.propertyId).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: 'Property linked to seller successfully',
      data: { ...seller.toObject(), propertiesLinked },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/sellers/:id/unlink-property/:propertyId
 * Unlink a property from a seller by removing the SellerProperty junction record.
 */
const unlinkProperty = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id };
    const seller = await Seller.findOne(filter);

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    await SellerProperty.findOneAndDelete({
      sellerId: seller._id,
      propertyId: req.params.propertyId,
    });

    // Return seller with updated linked properties
    const links = await SellerProperty.find({ sellerId: seller._id }).populate('propertyId');
    const propertiesLinked = links.map((l) => l.propertyId).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: 'Property unlinked from seller successfully',
      data: { ...seller.toObject(), propertiesLinked },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllSellers,
  getSellerById,
  createSeller,
  updateSeller,
  deleteSeller,
  linkProperty,
  unlinkProperty,
  sellerValidation,
};
