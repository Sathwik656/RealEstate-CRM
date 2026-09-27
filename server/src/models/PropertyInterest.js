'use strict';
const mongoose = require('mongoose');

const propertyInterestSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Tracks where this agent stands in the assignment lifecycle for this property.
    // interested  → agent expressed interest, not yet acted on
    // waiting     → another agent was selected; this agent is queued for potential reassignment
    // selected    → this agent is currently assigned to the active deal
    // returned    → this agent was previously selected but was unassigned/reassigned (or returned to allotment)
    status: {
      type: String,
      enum: ['interested', 'waiting', 'selected', 'returned'],
      default: 'interested',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent an agent from expressing interest multiple times in the same property
propertyInterestSchema.index({ propertyId: 1, agentId: 1 }, { unique: true });
propertyInterestSchema.index({ propertyId: 1, status: 1 });

module.exports = mongoose.model('PropertyInterest', propertyInterestSchema);
