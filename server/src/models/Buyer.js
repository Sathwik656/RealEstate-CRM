'use strict';
const mongoose = require('mongoose');

const PROPERTY_TYPES = [
  'Land',
  'Shop',
  'Independent House',
  'Flat',
  'Store',
  'Garage',
];

const buyerSchema = new mongoose.Schema(
  {
    buyerId: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
    seqNumber: {
      type: Number,
    },
    buyerName: {
      type: String,
      required: [true, 'Buyer name is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    preferredLocation: {
      type: String,
      trim: true,
      index: true,
    },
    propertyTypeInterested: {
      type: String,
      enum: PROPERTY_TYPES,
    },
    purpose: {
      type: String,
      enum: ['Purchase', 'Rent'],
      required: [true, 'Purpose is required'],
      index: true,
    },
    budgetMin: {
      type: Number,
      min: [0, 'Budget minimum cannot be negative'],
    },
    budgetMax: {
      type: Number,
      min: [0, 'Budget maximum cannot be negative'],
    },
    areaRequirement: {
      type: Number,
      min: [0, 'Area requirement cannot be negative'],
    },
    bhkRequirement: {
      type: Number,
      enum: [1, 2, 3, 4, 5, null],
      default: null,
      index: true,
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          const type = this.propertyTypeInterested || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.propertyTypeInterested) || (this.getUpdate && this.getUpdate().propertyTypeInterested);
          if (!type) return true;
          return ['Independent House', 'Flat'].includes(type);
        },
        message: 'BHK requirement can only be set when interested in Independent House and Flat'
      }
    },
    parkingRequirement: {
      type: String,
      enum: ['Open', 'Covered', 'Any'],
      default: 'Any',
    },
    remarks: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Closed', 'Follow-up'],
      default: 'Active',
      index: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referredByAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

buyerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Buyer', buyerSchema);
