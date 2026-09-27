'use strict';
const mongoose = require('mongoose');

/**
 * DealAssignment — Immutable history of every agent assignment for a deal.
 * Records are never deleted; only endedAt/endedBy are set when an assignment ends.
 */
const dealAssignmentSchema = new mongoose.Schema(
  {
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
      index: true,
    },
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
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignmentType: {
      type: String,
      enum: ['initial', 'reassignment'],
      required: true,
    },
    previousAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    // Set when this assignment ends (agent unassigned or reassigned)
    endedAt: {
      type: Date,
      default: null,
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

dealAssignmentSchema.index({ dealId: 1, createdAt: -1 });

module.exports = mongoose.model('DealAssignment', dealAssignmentSchema);
