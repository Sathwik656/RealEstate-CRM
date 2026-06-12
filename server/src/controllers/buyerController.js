'use strict';
const { body } = require('express-validator');
const Buyer = require('../models/Buyer');
const { generateId } = require('../utils/generateId');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const buyerValidation = [
  body('buyerName').trim().notEmpty().withMessage('Buyer name is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
  body('budgetMax')
    .optional()
    .isNumeric()
    .withMessage('Budget max must be a number'),
  body('budgetMin')
    .optional()
    .isNumeric()
    .withMessage('Budget min must be a number'),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/buyers
 */
const getAllBuyers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = { createdBy: req.user._id };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { buyerName: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Buyer.countDocuments(filter);
    const buyers = await Buyer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Buyers fetched successfully',
      data: buyers,
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
 * GET /api/buyers/followups
 * Get buyers whose followUpDate is today or overdue.
 */
const getBuyerFollowUps = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const buyers = await Buyer.find({
      createdBy: req.user._id,
      followUpDate: { $lte: tomorrow },
      status: { $ne: 'Closed' },
    }).sort({ followUpDate: 1 });

    return res.status(200).json({
      success: true,
      message: 'Follow-up buyers fetched successfully',
      data: buyers,
      pagination: { total: buyers.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/buyers/:id
 */
const getBuyerById = async (req, res, next) => {
  try {
    const buyer = await Buyer.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!buyer) {
      return res.status(404).json({ success: false, message: 'Buyer not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Buyer fetched successfully',
      data: buyer,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/buyers
 */
const createBuyer = async (req, res, next) => {
  try {
    const buyerId = generateId('BUY');
    const buyer = await Buyer.create({ ...req.body, buyerId, createdBy: req.user._id });

    return res.status(201).json({
      success: true,
      message: 'Buyer created successfully',
      data: buyer,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/buyers/:id
 */
const updateBuyer = async (req, res, next) => {
  try {
    delete req.body.buyerId;

    const buyer = await Buyer.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      {
      new: true,
      runValidators: true,
    });

    if (!buyer) {
      return res.status(404).json({ success: false, message: 'Buyer not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Buyer updated successfully',
      data: buyer,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/buyers/:id
 */
const deleteBuyer = async (req, res, next) => {
  try {
    const buyer = await Buyer.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });

    if (!buyer) {
      return res.status(404).json({ success: false, message: 'Buyer not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Buyer deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/buyers/:id/status
 */
const updateBuyerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Active', 'Closed', 'Follow-up'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const buyer = await Buyer.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!buyer) {
      return res.status(404).json({ success: false, message: 'Buyer not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Buyer status updated successfully',
      data: buyer,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllBuyers,
  getBuyerFollowUps,
  getBuyerById,
  createBuyer,
  updateBuyer,
  deleteBuyer,
  updateBuyerStatus,
  buyerValidation,
};
