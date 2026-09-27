'use strict';
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    dealId: {
      type: String,
      required: true,
      unique: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    // The original agent who was first assigned this deal (preserved forever for history)
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The agent who is CURRENTLY assigned and actively working the deal.
    // Updated on every reassignment. Set to null when unassigned without replacement.
    currentAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['ongoing', 'unassign_requested', 'pending_approval', 'completed'],
      default: 'ongoing',
      index: true,
    },
    closingPrice: {
      type: Number,
      min: [0, 'Closing price cannot be negative'],
      default: null,
    },
    markedDoneAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Set when current agent requests to be unassigned
    unassignRequestedAt: {
      type: Date,
      default: null,
    },
    unassignReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quickly finding deals by current agent with a given status
dealSchema.index({ currentAgentId: 1, status: 1 });
dealSchema.index({ agentId: 1, status: 1 });

module.exports = mongoose.model('Deal', dealSchema);
