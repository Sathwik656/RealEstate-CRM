'use strict';
const { body } = require('express-validator');
const Deal = require('../models/Deal');
const Report = require('../models/Report');
const Property = require('../models/Property');
const { generateId } = require('../utils/generateId');
const { generateDealCode } = require('../utils/generateCode');
const { notifyDealCompleted, notifyDealApproved } = require('../services/pushNotificationService');

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
 * Shows deals where the agent is currently assigned (currentAgentId),
 * plus completed deals they were involved with (agentId).
 */
const getMyDeals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const agentId = req.user._id;

    let filter;
    if (status) {
      filter = { currentAgentId: agentId, status };
    } else {
      filter = { currentAgentId: agentId };
    }

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
      .populate('currentAgentId', 'name email code')
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
      .populate('currentAgentId', 'name email code')
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
 * Admin OR the agent currently assigned (or original) can view it.
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
      .populate('currentAgentId', 'name email code')
      .populate('agentId', 'name email code');

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    // Agents can view a deal only if they are the current or original agent
    if (req.user.role === 'agent') {
      const uid = req.user._id.toString();
      const isCurrentAgent = deal.currentAgentId?._id?.toString() === uid;
      const isOriginalAgent = deal.agentId?._id?.toString() === uid;
      if (!isCurrentAgent && !isOriginalAgent) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
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
 * Only the CURRENTLY assigned agent can mark a deal as done.
 */
const markDealDone = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      currentAgentId: req.user._id,
      status: 'ongoing',
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found, or you are not the currently assigned agent, or the deal is not ongoing.',
      });
    }

    deal.status = 'pending_approval';
    deal.markedDoneAt = new Date();
    await deal.save();

    const populated = await Deal.findById(deal._id)
      .populate({ path: 'propertyId', populate: { path: 'location' } })
      .populate('currentAgentId', 'name email code')
      .populate('agentId', 'name email code');

    // Notify all admins
    notifyDealCompleted(populated, populated.propertyId, populated.currentAgentId);

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
 * Admin approves a pending deal.
 * Report is credited to the CURRENT (completing) agent — deal.currentAgentId.
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

    // currentAgentId must be set to approve
    if (!deal.currentAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve: deal has no currently assigned agent.',
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

    // 3. Create Report — credited to the COMPLETING (current) agent
    const reportId = generateId('RPT');
    const report = await Report.findOneAndUpdate(
      { dealId: deal._id },
      {
        $setOnInsert: {
          reportId,
          dealId: deal._id,
          propertyId: deal.propertyId._id,
          agentId: deal.currentAgentId,   // completing agent
          closingPrice: Number(closingPrice),
          originalPrice: deal.propertyId.price || null,
          completedAt: now,
        },
      },
      { upsert: true, new: true }
    );

    const populatedDeal = await Deal.findById(deal._id)
      .populate({ path: 'propertyId', populate: { path: 'location' } })
      .populate('currentAgentId', 'name email code')
      .populate('agentId', 'name email code');

    // Notify completing agent
    notifyDealApproved(populatedDeal, populatedDeal.propertyId, deal.currentAgentId);

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
