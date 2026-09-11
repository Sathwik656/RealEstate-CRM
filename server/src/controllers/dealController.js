'use strict';
const { body } = require('express-validator');
const Deal = require('../models/Deal');
const Report = require('../models/Report');
const Property = require('../models/Property');
const { generateId } = require('../utils/generateId');
const { generateDealCode } = require('../utils/generateCode');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const approveDealValidation = [
  body('closingPrice')
    .notEmpty().withMessage('Closing price is required')
    .isNumeric().withMessage('Closing price must be a valid number')
    .custom((v) => v >= 0).withMessage('Closing price cannot be negative'),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/deals/my
 * Agent fetches their own deals.
 */
const getMyDeals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { agentId: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Deal.countDocuments(filter);
    const deals = await Deal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: 'propertyId',
        populate: [
          { path: 'location' },
          { path: 'sellerId', select: 'sellerName contactNumber address' },
          { path: 'referredByAgentId', select: 'name email code' },
        ],
      })
      .populate('agentId', 'name email code');

    return res.status(200).json({
      success: true,
      message: 'Your deals fetched successfully',
      data: deals,
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
 * GET /api/deals
 * Admin fetches all deals.
 */
const getAllDeals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Deal.countDocuments(filter);
    const deals = await Deal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: 'propertyId',
        populate: [
          { path: 'location' },
          { path: 'sellerId', select: 'sellerName contactNumber address' },
          { path: 'referredByAgentId', select: 'name email code' },
        ],
      })
      .populate('agentId', 'name email code');

    return res.status(200).json({
      success: true,
      message: 'All deals fetched successfully',
      data: deals,
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
 * GET /api/deals/:id
 * Admin OR the agent who owns the deal can view it.
 */
const getDealById = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate({
        path: 'propertyId',
        populate: [
          { path: 'location' },
          { path: 'sellerId', select: 'sellerName contactNumber address' },
          { path: 'referredByAgentId', select: 'name email code' },
        ],
      })
      .populate('agentId', 'name email code');

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    // Agents can only view their own deals
    if (req.user.role === 'agent' && deal.agentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({
      success: true,
      message: 'Deal fetched successfully',
      data: deal,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/deals/:id/done
 * Agent marks their ongoing deal as pending_approval.
 */
const markDealDone = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      agentId: req.user._id,
      status: 'ongoing',
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found, or it is not yours, or it is not in ongoing status.',
      });
    }

    deal.status = 'pending_approval';
    deal.markedDoneAt = new Date();
    await deal.save();

    const populated = await Deal.findById(deal._id)
      .populate({ path: 'propertyId', populate: { path: 'location' } })
      .populate('agentId', 'name email code');

    return res.status(200).json({
      success: true,
      message: 'Deal marked as pending approval. Waiting for admin review.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/deals/:id/approve
 * Admin approves a pending deal, enters closing price, marks property sold, creates Report.
 */
const approveDeal = async (req, res, next) => {
  try {
    const { closingPrice } = req.body;

    const deal = await Deal.findOne({ _id: req.params.id, status: 'pending_approval' })
      .populate('propertyId');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found or it is not in pending_approval status.',
      });
    }

    const now = new Date();

    // 1. Update deal
    deal.status = 'completed';
    deal.closingPrice = Number(closingPrice);
    deal.completedAt = now;
    await deal.save();

    // 2. Mark property as Sold
    await Property.findByIdAndUpdate(deal.propertyId._id, { propertyStatus: 'Sold' });

    // 3. Create Report — findOneAndUpdate with upsert prevents duplicates
    const reportId = generateId('RPT');
    const report = await Report.findOneAndUpdate(
      { dealId: deal._id },
      {
        $setOnInsert: {
          reportId,
          dealId: deal._id,
          propertyId: deal.propertyId._id,
          agentId: deal.agentId,
          closingPrice: Number(closingPrice),
          originalPrice: deal.propertyId.price || null,
          completedAt: now,
        },
      },
      { upsert: true, new: true }
    );

    const populatedDeal = await Deal.findById(deal._id)
      .populate({ path: 'propertyId', populate: { path: 'location' } })
      .populate('agentId', 'name email code');

    return res.status(200).json({
      success: true,
      message: 'Deal approved successfully. Property is now marked as Sold.',
      data: { deal: populatedDeal, report },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyDeals,
  getAllDeals,
  getDealById,
  markDealDone,
  approveDeal,
  approveDealValidation,
};
