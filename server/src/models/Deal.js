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
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ongoing', 'pending_approval', 'completed'],
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
  },
  {
    timestamps: true,
  }
);

// Index for quickly finding deals owned by an agent with a given status
dealSchema.index({ agentId: 1, status: 1 });

module.exports = mongoose.model('Deal', dealSchema);
