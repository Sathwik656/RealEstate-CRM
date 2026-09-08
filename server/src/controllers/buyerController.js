'use strict';
const { body } = require('express-validator');
const Buyer = require('../models/Buyer');
const { generateId } = require('../utils/generateId');
const { generateEntityCode } = require('../utils/generateCode');

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
  body('note').optional().trim(),
  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
    .isIn(['Purchase', 'Rent'])
    .withMessage('Purpose must be Purchase or Rent'),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/buyers
 */
const getAllBuyers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = req.user.role === 'admin' ? {} : { referredByAgentId: req.user._id };

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
      .limit(Number(limit))
      .populate('referredByAgentId', 'name email');

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
 * GET /api/buyers/:id
 */
const getBuyerById = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id };
    const buyer = await Buyer.findOne(filter)
      .populate('referredByAgentId', 'name email');

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
 * Admin can set referredByAgentId to indicate which agent referred this buyer.
 */
const createBuyer = async (req, res, next) => {
  try {
    const buyerData = req.body;
    const buyerId = generateId('BUY');
    const { code, seqNumber } = await generateEntityCode('Buyer');
    const finalBuyerData = {
      ...buyerData,
      buyerId,
      code,
      seqNumber,
      createdByUserId: req.user._id,
    };
    if (req.user.role !== 'admin') {
      finalBuyerData.referredByAgentId = req.user._id;
    }

    const buyer = await Buyer.create(finalBuyerData);

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
    const buyerData = req.body;
    delete buyerData.buyerId;

    const buyer = await Buyer.findOneAndUpdate(
      req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id },
      buyerData,
      {
        new: true,
        runValidators: true,
      }
    );

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
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id };
    const buyer = await Buyer.findOneAndDelete(filter);

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
      req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, referredByAgentId: req.user._id },
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
  getBuyerById,
  createBuyer,
  updateBuyer,
  deleteBuyer,
  updateBuyerStatus,
  buyerValidation,
};
