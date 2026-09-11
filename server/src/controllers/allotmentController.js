'use strict';
const Property = require('../models/Property');
const PropertyInterest = require('../models/PropertyInterest');
const Deal = require('../models/Deal');
const { generateDealCode } = require('../utils/generateCode');

/**
 * POST /api/allotments/:propertyId/interest
 * Agent expresses interest in a property.
 * Must be 'Available' or 'In Allotment'.
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
        message: `Cannot express interest. Property is currently ${property.propertyStatus}` 
      });
    }

    // Check for existing interest
    const existingInterest = await PropertyInterest.findOne({ propertyId, agentId });
    if (existingInterest) {
      return res.status(400).json({ success: false, message: 'You have already expressed interest in this property' });
    }

    // Create interest record
    await PropertyInterest.create({ propertyId, agentId });

    // If it was 'Available', move to 'In Allotment'
    if (property.propertyStatus === 'Available') {
      property.propertyStatus = 'In Allotment';
      await property.save();
    }

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
 * Admin fetches all properties currently in allotment, along with interested agents.
 */
const getAllotments = async (req, res, next) => {
  try {
    // Find all properties in allotment
    const properties = await Property.find({ propertyStatus: 'In Allotment' })
      .populate('location')
      .populate('sellerId', 'sellerName contactNumber address')
      .populate('referredByAgentId', 'name email code')
      .sort({ updatedAt: -1 });

    // For each property, fetch interested agents
    const allotments = await Promise.all(
      properties.map(async (property) => {
        const interests = await PropertyInterest.find({ propertyId: property._id })
          .populate('agentId', 'name email code phone')
          .sort({ createdAt: 1 });
        
        return {
          property,
          interests: interests.map((i) => ({
            _id: i._id,
            agent: i.agentId,
            expressedAt: i.createdAt,
          })),
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Allotments fetched successfully',
      data: allotments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/allotments/:propertyId/allot
 * Admin allots a property to a specific interested agent.
 * Creates a Deal and changes property status to 'In Deal'.
 */
const allotProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'agentId is required for allotment' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.propertyStatus !== 'In Allotment') {
      return res.status(400).json({ 
        success: false, 
        message: `Property cannot be allotted. Current status is ${property.propertyStatus}` 
      });
    }

    // Verify agent expressed interest
    const interest = await PropertyInterest.findOne({ propertyId, agentId });
    if (!interest) {
      return res.status(400).json({ success: false, message: 'This agent has not expressed interest in this property' });
    }

    // Atomically claim the property
    const updatedProperty = await Property.findOneAndUpdate(
      { _id: propertyId, propertyStatus: 'In Allotment' },
      { $set: { propertyStatus: 'In Deal' } },
      { new: true }
    );

    if (!updatedProperty) {
      return res.status(409).json({ success: false, message: 'Property state changed. Cannot complete allotment.' });
    }

    const dealId = await generateDealCode();
    const deal = await Deal.create({
      dealId,
      propertyId: updatedProperty._id,
      agentId,
      status: 'ongoing',
    });

    return res.status(201).json({
      success: true,
      message: 'Property allotted successfully. Deal created.',
      data: deal,
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
