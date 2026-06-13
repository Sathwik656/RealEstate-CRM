'use strict';
const mongoose = require('mongoose');

const PROPERTY_TYPES = [
  'Land',
  'Independent House',
  'Apartment/Flat',
  'Commercial Property',
  'Agricultural Land',
  'Industrial Property',
  'Rental Property',
  'Lease Property',
];

const buyerSchema = new mongoose.Schema(
  {
    buyerId: {
      type: String,
      unique: true,
      index: true,
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
    landmarkPreference: {
      type: String,
      trim: true,
    },
    propertyTypeInterested: {
      type: String,
      enum: PROPERTY_TYPES,
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
    },
    parkingRequirement: {
      type: String,
      enum: ['Open', 'Covered', 'Any'],
      default: 'Any',
    },
    followUpDate: {
      type: Date,
      index: true,
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
    createdBy: {
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

buyerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Buyer', buyerSchema);
