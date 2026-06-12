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

const propertySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      unique: true,
      index: true,
    },
    propertyType: {
      type: String,
      enum: PROPERTY_TYPES,
      required: [true, 'Property type is required'],
      index: true,
    },
    propertyTitle: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
    },
    propertyDescription: {
      type: String,
      trim: true,
    },
    propertyStatus: {
      type: String,
      enum: ['Available', 'Sold', 'Rented', 'Leased'],
      default: 'Available',
      index: true,
    },
    purpose: {
      type: String,
      enum: ['Sale', 'Rent', 'Lease'],
      required: [true, 'Purpose is required'],
      index: true,
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
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
    location: {
      type: String,
      trim: true,
      index: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    parkingAvailable: {
      type: Boolean,
      default: false,
    },
    parkingType: {
      type: String,
      enum: ['Open', 'Covered', 'None'],
      default: 'None',
    },
    area: {
      type: Number,
      min: [0, 'Area cannot be negative'],
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    bhk: {
      type: Number,
      enum: [1, 2, 3, 4, 5, null],
      default: null,
      index: true,
    },
    images: [
      {
        type: String,
      },
    ],
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

// Compound indexes for frequent query patterns
propertySchema.index({ location: 1, propertyStatus: 1 });
propertySchema.index({ propertyType: 1, purpose: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Property', propertySchema);
module.exports.PROPERTY_TYPES = PROPERTY_TYPES;
