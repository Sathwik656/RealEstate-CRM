'use strict';
const { body } = require('express-validator');
const Seller = require('../models/Seller');
const Property = require('../models/Property');
const { generateId } = require('../utils/generateId');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const sellerValidation = [
  body('sellerName').trim().notEmpty().withMessage('Seller name is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/sellers
 */
const getAllSellers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter = {};

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
      .limit(Number(limit));

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
 * Populate propertiesLinked.
 */
const getSellerById = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id).populate('propertiesLinked');

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Seller fetched successfully',
      data: seller,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/sellers
 */
const createSeller = async (req, res, next) => {
  try {
    const sellerId = generateId('SEL');
    const seller = await Seller.create({ ...req.body, sellerId });

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

    const seller = await Seller.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

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
 */
const deleteSeller = async (req, res, next) => {
  try {
    const seller = await Seller.findByIdAndDelete(req.params.id);

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

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
 * Link a property to a seller.
 */
const linkProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'propertyId is required' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { propertiesLinked: propertyId } },
      { new: true }
    ).populate('propertiesLinked');

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Property linked to seller successfully',
      data: seller,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/sellers/:id/unlink-property/:propertyId
 * Unlink a property from a seller.
 */
const unlinkProperty = async (req, res, next) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { $pull: { propertiesLinked: req.params.propertyId } },
      { new: true }
    ).populate('propertiesLinked');

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Property unlinked from seller successfully',
      data: seller,
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
