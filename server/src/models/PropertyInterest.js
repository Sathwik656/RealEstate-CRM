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
  },
  {
    timestamps: true,
  }
);

// Prevent an agent from expressing interest multiple times in the same property
propertyInterestSchema.index({ propertyId: 1, agentId: 1 }, { unique: true });

module.exports = mongoose.model('PropertyInterest', propertyInterestSchema);
