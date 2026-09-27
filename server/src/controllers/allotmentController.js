'use strict';
const Property = require('../models/Property');
const PropertyInterest = require('../models/PropertyInterest');
const Deal = require('../models/Deal');
const DealAssignment = require('../models/DealAssignment');
const { generateDealCode } = require('../utils/generateCode');
const {
  notifyAgentInterested,
  notifyPropertyAssigned,
} = require('../services/pushNotificationService');

/**
 * POST /api/allotments/:propertyId/interest
 * Agent expresses interest in a property.
 * Property must be 'Available' or 'In Allotment'.
 */
const expressInterest = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const agentId = req.user._id;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (!['Available', 'In Allotment'].includes(property.propertyStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot express interest. Property is currently ${property.propertyStatus}`,
      });
    }

    // Prevent duplicate interest
    const existingInterest = await PropertyInterest.findOne({ propertyId, agentId });
    if (existingInterest) {
      return res.status(400).json({
        success: false,
        message: 'You have already expressed interest in this property',
      });
    }

    // Create interest record with default status 'interested'
    await PropertyInterest.create({ propertyId, agentId, status: 'interested' });

    // Move property to 'In Allotment' if it was 'Available'
    if (property.propertyStatus === 'Available') {
      property.propertyStatus = 'In Allotment';
      await property.save();
    }

    notifyAgentInterested(property, req.user);

    return res.status(200).json({
      success: true,
      message: 'Interest registered successfully. The property is now in allotment.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/allotments
 * Admin fetches:
 *  - Category 1: Properties currently 'In Allotment' (need initial assignment)
 *  - Category 2: Properties 'In Deal' where deal status is 'unassign_requested'
 *    (need reassignment or keep decision)
 */
const getAllotments = async (req, res, next) => {
  try {
    // ── Category 1: In Allotment (initial assignment pending) ──────────────────
    const allotmentProperties = await Property.find({ propertyStatus: 'In Allotment' })
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber address')
      .populate('referredByAgentId', 'name email code')
      .sort({ updatedAt: -1 });

    const initialAllotments = await Promise.all(
      allotmentProperties.map(async (property) => {
        const interests = await PropertyInterest.find({ 
          propertyId: property._id,
          status: { $in: ['interested', 'waiting', 'selected'] }
        })
          .populate('agentId', 'name email code phone')
          .sort({ createdAt: 1 });

        return {
          property,
          currentDeal: null,
          interests: interests.map((i) => ({
            _id: i._id,
            agent: i.agentId,
            status: i.status,
            expressedAt: i.createdAt,
          })),
        };
      })
    );

    // ── Category 2: Unassignment Requests (In Deal, agent requested to leave) ──
    const unassignDeals = await Deal.find({ status: 'unassign_requested' })
      .populate({
        path: 'propertyId',
        populate: [
          { path: 'location' },
          { path: 'sellerId', select: 'sellerName contactNumber address' },
          { path: 'referredByAgentId', select: 'name email code' },
        ],
      })
      .populate('currentAgentId', 'name email code phone')
      .populate('agentId', 'name email code')
      .sort({ unassignRequestedAt: -1 });

    const unassignmentRequests = await Promise.all(
      unassignDeals.map(async (deal) => {
        const property = deal.propertyId;
        // Fetch all waiting/interested agents for potential reassignment
        const interests = await PropertyInterest.find({
          propertyId: property._id,
          status: { $in: ['waiting', 'interested'] },
        })
          .populate('agentId', 'name email code phone')
          .sort({ createdAt: 1 });

        return {
          property,
          currentDeal: {
            _id: deal._id,
            dealId: deal.dealId,
            status: deal.status,
            unassignRequestedAt: deal.unassignRequestedAt,
            unassignReason: deal.unassignReason,
            currentAgent: deal.currentAgentId,
          },
          interests: interests.map((i) => ({
            _id: i._id,
            agent: i.agentId,
            status: i.status,
            expressedAt: i.createdAt,
          })),
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Allotments fetched successfully',
      data: {
        initialAllotments,
        unassignmentRequests,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/allotments/:propertyId/allot
 * Admin allots a property (currently 'In Allotment') to an interested agent.
 * - Sets selected agent's interest → 'selected'
 * - Sets all other interests → 'waiting'
 * - Creates Deal with currentAgentId
 * - Creates initial DealAssignment record
 * - Updates property → 'In Deal'
 */
const allotProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { agentId } = req.body;
    const adminId = req.user._id;

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'agentId is required' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.propertyStatus !== 'In Allotment') {
      return res.status(400).json({
        success: false,
        message: `Property cannot be allotted. Current status is ${property.propertyStatus}`,
      });
    }

    // Verify agent expressed interest in this property and is eligible
    const selectedInterest = await PropertyInterest.findOne({ 
      propertyId, 
      agentId,
      status: { $in: ['interested', 'waiting'] }
    });
    if (!selectedInterest) {
      return res.status(400).json({
        success: false,
        message: 'This agent has not expressed interest in this property or is no longer eligible',
      });
    }

    // Ensure no other agent is already 'selected' (safety check)
    const alreadySelected = await PropertyInterest.findOne({
      propertyId,
      status: 'selected',
      agentId: { $ne: agentId },
    });
    if (alreadySelected) {
      return res.status(409).json({
        success: false,
        message: 'Another agent is already selected for this property',
      });
    }

    // Atomically claim the property
    const updatedProperty = await Property.findOneAndUpdate(
      { _id: propertyId, propertyStatus: 'In Allotment' },
      { $set: { propertyStatus: 'In Deal' } },
      { new: true }
    );

    if (!updatedProperty) {
      return res.status(409).json({
        success: false,
        message: 'Property state changed. Cannot complete allotment.',
      });
    }

    // Update interest statuses atomically
    // Selected agent → 'selected'
    await PropertyInterest.updateOne(
      { propertyId, agentId },
      { $set: { status: 'selected' } }
    );

    // All other agents with 'interested' status → 'waiting'
    await PropertyInterest.updateMany(
      { propertyId, agentId: { $ne: agentId }, status: 'interested' },
      { $set: { status: 'waiting' } }
    );

    // Create the Deal
    const dealId = await generateDealCode();
    const deal = await Deal.create({
      dealId,
      propertyId: updatedProperty._id,
      agentId,         // original agent (preserved forever)
      currentAgentId: agentId, // currently assigned
      status: 'ongoing',
    });

    // Create initial DealAssignment record
    await DealAssignment.create({
      dealId: deal._id,
      propertyId: updatedProperty._id,
      agentId,
      assignedBy: adminId,
      assignmentType: 'initial',
      previousAgentId: null,
    });

    // Notify selected agent
    notifyPropertyAssigned(updatedProperty, agentId);

    const populated = await Deal.findById(deal._id)
      .populate({ path: 'propertyId', populate: { path: 'location' } })
      .populate('currentAgentId', 'name email code');

    return res.status(201).json({
      success: true,
      message: 'Property allotted successfully. Deal created.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  expressInterest,
  getAllotments,
  allotProperty,
};
