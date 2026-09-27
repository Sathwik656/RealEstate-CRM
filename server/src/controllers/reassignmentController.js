'use strict';
const Deal = require('../models/Deal');
const DealAssignment = require('../models/DealAssignment');
const PropertyInterest = require('../models/PropertyInterest');
const Property = require('../models/Property');
const {
  notifyUnassignmentRequested,
  notifyPropertyReassigned,
  notifyAgentUnassigned,
} = require('../services/pushNotificationService');

// ─── Shared populate helper ────────────────────────────────────────────────────

const populateDeal = (query) =>
  query
    .populate({
      path: 'propertyId',
      populate: [
        { path: 'location' },
        { path: 'sellerId', select: 'sellerName contactNumber address' },
        { path: 'referredByAgentId', select: 'name email code' },
      ],
    })
    .populate('currentAgentId', 'name email code phone')
    .populate('agentId', 'name email code');

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * PATCH /api/deals/:id/request-unassign
 * Agent (currently assigned) requests to be unassigned from their deal.
 * Agent stays assigned until admin processes the request.
 */
const requestUnassignment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const agentId = req.user._id;

    const deal = await Deal.findOne({
      _id: req.params.id,
      currentAgentId: agentId,
      status: 'ongoing',
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found, not yours, or not in ongoing status.',
      });
    }

    deal.status = 'unassign_requested';
    deal.unassignRequestedAt = new Date();
    deal.unassignReason = reason || null;
    await deal.save();

    const populated = await populateDeal(Deal.findById(deal._id));

    // Notify all admins
    notifyUnassignmentRequested(populated, populated.propertyId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Unassignment request submitted. Admin has been notified.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/reassignments/:dealId/handle
 * Admin handles an unassignment request.
 * Body: { action: 'keep' | 'unassign', newAgentId?: string, reason?: string }
 *
 * 'keep'    → revert deal to ongoing
 * 'unassign' (no newAgentId) → unassign current agent, property → In Allotment
 * 'unassign' (with newAgentId) → delegates to reassign flow
 */
const handleUnassignmentRequest = async (req, res, next) => {
  try {
    const { action, newAgentId, reason } = req.body;
    const adminId = req.user._id;

    if (!['keep', 'unassign'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be "keep" or "unassign"' });
    }

    const deal = await Deal.findOne({
      _id: req.params.dealId,
      status: 'unassign_requested',
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found or not in unassign_requested status.',
      });
    }

    // ── Keep assigned ──────────────────────────────────────────────────────────
    if (action === 'keep') {
      deal.status = 'ongoing';
      deal.unassignRequestedAt = null;
      deal.unassignReason = null;
      await deal.save();

      return res.status(200).json({
        success: true,
        message: 'Assignment kept. Deal is ongoing again.',
        data: await populateDeal(Deal.findById(deal._id)),
      });
    }

    // ── Unassign — with replacement (delegate to reassign) ─────────────────────
    if (action === 'unassign' && newAgentId) {
      req.params.dealId = deal._id.toString();
      req.body = { newAgentId, reason };
      return reassignDeal(req, res, next);
    }

    // ── Unassign — no replacement ──────────────────────────────────────────────
    const previousAgentId = deal.currentAgentId;

    // End the current DealAssignment
    await DealAssignment.findOneAndUpdate(
      { dealId: deal._id, endedAt: null },
      { $set: { endedAt: new Date(), endedBy: adminId } }
    );

    // Update old agent's interest to 'returned'
    await PropertyInterest.updateOne(
      { propertyId: deal.propertyId, agentId: previousAgentId },
      { $set: { status: 'returned' } }
    );

    // Update deal — currentAgentId = null, revert status to ongoing
    deal.currentAgentId = null;
    deal.status = 'ongoing';
    deal.unassignRequestedAt = null;
    deal.unassignReason = null;
    await deal.save();

    // Check if there are other active interested agents
    const otherInterestsCount = await PropertyInterest.countDocuments({
      propertyId: deal.propertyId,
      status: 'interested'
    });

    const newPropertyStatus = otherInterestsCount > 0 ? 'In Allotment' : 'Available';

    // Property → In Allotment or Available
    await Property.findByIdAndUpdate(deal.propertyId, {
      $set: { propertyStatus: newPropertyStatus },
    });

    // Notify old agent their assignment ended
    notifyAgentUnassigned(deal.propertyId, previousAgentId);

    return res.status(200).json({
      success: true,
      message: `Agent unassigned. Property moved back to ${newPropertyStatus}.`,
      data: await populateDeal(Deal.findById(deal._id)),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/reassignments/:dealId/reassign
 * Admin reassigns an active or unassign-requested deal to another interested agent.
 * Body: { newAgentId: string, reason?: string }
 *
 * Atomic flow:
 *  1. End current DealAssignment
 *  2. Old agent interest → unassigned
 *  3. New agent interest → selected
 *  4. Deal.currentAgentId = newAgentId, status = ongoing
 *  5. Property → In Deal
 *  6. Create new DealAssignment
 *  7. Notify new agent
 */
const reassignDeal = async (req, res, next) => {
  try {
    const { newAgentId, reason } = req.body;
    const adminId = req.user._id;

    if (!newAgentId) {
      return res.status(400).json({ success: false, message: 'newAgentId is required' });
    }

    const deal = await Deal.findOne({
      _id: req.params.dealId,
      status: { $in: ['ongoing', 'unassign_requested'] },
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found or not in a reassignable state.',
      });
    }

    if (deal.currentAgentId && deal.currentAgentId.toString() === newAgentId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'New agent is already the current agent.',
      });
    }

    // Verify new agent has an 'interested' or 'waiting' interest record
    const newInterest = await PropertyInterest.findOne({
      propertyId: deal.propertyId,
      agentId: newAgentId,
      status: { $in: ['interested', 'waiting'] },
    });

    if (!newInterest) {
      return res.status(400).json({
        success: false,
        message: 'Selected agent has not expressed interest in this property or is not eligible for reassignment.',
      });
    }

    const previousAgentId = deal.currentAgentId;

    // End the current open DealAssignment
    if (previousAgentId) {
      await DealAssignment.findOneAndUpdate(
        { dealId: deal._id, endedAt: null },
        { $set: { endedAt: new Date(), endedBy: adminId } }
      );

      // Old agent interest → returned
      await PropertyInterest.updateOne(
        { propertyId: deal.propertyId, agentId: previousAgentId },
        { $set: { status: 'returned' } }
      );
    }

    // New agent interest → selected
    await PropertyInterest.updateOne(
      { propertyId: deal.propertyId, agentId: newAgentId },
      { $set: { status: 'selected' } }
    );

    // Update Deal
    deal.currentAgentId = newAgentId;
    deal.status = 'ongoing';
    deal.unassignRequestedAt = null;
    deal.unassignReason = null;
    await deal.save();

    // Property stays (or returns to) 'In Deal'
    await Property.findByIdAndUpdate(deal.propertyId, {
      $set: { propertyStatus: 'In Deal' },
    });

    // Create new DealAssignment record
    await DealAssignment.create({
      dealId: deal._id,
      propertyId: deal.propertyId,
      agentId: newAgentId,
      assignedBy: adminId,
      assignmentType: 'reassignment',
      previousAgentId: previousAgentId || null,
      reason: reason || null,
    });

    const populated = await populateDeal(Deal.findById(deal._id));

    // Notify new agent
    notifyPropertyReassigned(populated.propertyId, newAgentId);

    // Optionally notify old agent
    if (previousAgentId) {
      notifyAgentUnassigned(populated.propertyId, previousAgentId);
    }

    return res.status(200).json({
      success: true,
      message: 'Deal reassigned successfully.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/reassignments/:dealId/unallot
 * Admin forcefully unallots a deal (removes current agent without selecting a new one)
 * Can be done regardless of whether the agent requested it.
 */
const unallotDeal = async (req, res, next) => {
  try {
    const adminId = req.user._id;

    const deal = await Deal.findOne({
      _id: req.params.dealId,
      status: { $in: ['ongoing', 'unassign_requested'] },
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found or not in a valid state.',
      });
    }

    if (!deal.currentAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Deal is already unassigned.',
      });
    }

    const previousAgentId = deal.currentAgentId;

    // End the current DealAssignment
    await DealAssignment.findOneAndUpdate(
      { dealId: deal._id, endedAt: null },
      { $set: { endedAt: new Date(), endedBy: adminId } }
    );

    // Update old agent's interest to 'returned'
    await PropertyInterest.updateOne(
      { propertyId: deal.propertyId, agentId: previousAgentId },
      { $set: { status: 'returned' } }
    );

    // Update deal — currentAgentId = null, revert status to ongoing
    deal.currentAgentId = null;
    deal.status = 'ongoing';
    deal.unassignRequestedAt = null;
    deal.unassignReason = null;
    await deal.save();

    // Check if there are other active interested agents
    const otherInterestsCount = await PropertyInterest.countDocuments({
      propertyId: deal.propertyId,
      status: 'interested'
    });

    const newPropertyStatus = otherInterestsCount > 0 ? 'In Allotment' : 'Available';

    // Property → In Allotment or Available
    await Property.findByIdAndUpdate(deal.propertyId, {
      $set: { propertyStatus: newPropertyStatus },
    });

    // Notify old agent their assignment ended
    notifyAgentUnassigned(deal.propertyId, previousAgentId);

    return res.status(200).json({
      success: true,
      message: `Property unallotted. Status moved back to ${newPropertyStatus}.`,
      data: await populateDeal(Deal.findById(deal._id)),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reassignments/:dealId/history
 * Admin fetches the full assignment history for a deal.
 */
const getDealAssignmentHistory = async (req, res, next) => {
  try {
    const history = await DealAssignment.find({ dealId: req.params.dealId })
      .populate('agentId', 'name email code')
      .populate('assignedBy', 'name email')
      .populate('previousAgentId', 'name email code')
      .populate('endedBy', 'name email')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: 'Assignment history fetched successfully',
      data: history,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestUnassignment,
  handleUnassignmentRequest,
  reassignDeal,
  unallotDeal,
  getDealAssignmentHistory,
};
