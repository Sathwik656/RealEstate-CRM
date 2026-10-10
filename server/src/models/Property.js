'use strict';
const mongoose = require('mongoose');

const PROPERTY_DIVISIONS = {
  'Residential': ['Independent House', 'Villa', 'Flat / Apartment', 'Duplex', 'Residential Land / Plot'],
  'Commercial': ['Shop', 'Showroom', 'Office Space', 'Commercial Building', 'Hotel', 'Restaurant', 'Commercial Land'],
  'Industrial': ['Factory', 'Manufacturing Unit', 'Warehouse', 'Industrial Shed', 'Industrial Land'],
  'Agricultural': ['Agricultural Land', 'Plantation', 'Paddy Field', 'Orchard', 'Farmhouse'],
  'Mixed-Use': ['Shop with Residence', 'Commercial Building with Residential Units']
};

const PROPERTY_DIVISIONS_LIST = Object.keys(PROPERTY_DIVISIONS);
const PROPERTY_TYPES_LIST = Object.values(PROPERTY_DIVISIONS).flat();

const propertySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      default: null,
      index: true,
    },
    propertyDivision: {
      type: String,
      enum: PROPERTY_DIVISIONS_LIST,
      required: [true, 'Property division is required'],
      index: true,
    },
    propertyType: {
      type: String,
      enum: PROPERTY_TYPES_LIST,
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
      enum: ['Available', 'In Allotment', 'In Deal', 'Sold'],
      default: 'Available',
      index: true,
    },
    purpose: {
      type: String,
      enum: ['Sale', 'Rent'],
      required: [true, 'Purpose is required'],
      index: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LocationCode',
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
    areaSqFt: {
      type: Number,
      min: [0, 'Area cannot be negative'],
    },
    areaCents: {
      type: Number,
      min: [0, 'Area cannot be negative'],
    },
    price: {
      type: Number,
      default: null,
      min: [0, 'Price cannot be negative'],
    },
    bhk: {
      type: Number,
      enum: [1, 2, 3, 4, 5, null],
      default: null,
      index: true,
    },
    mainDoorDirection: {
      type: String,
      enum: ['North', 'East', 'West', 'South'],
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
    yearOfConstruction: {
      type: Date,
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'approved', // Existing admin-created properties stay 'approved'
      index: true,
    },
    images: [{
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      visibility: { type: String, enum: ['Public', 'Private'], default: 'Public' }
    }],
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
module.exports.PROPERTY_DIVISIONS = PROPERTY_DIVISIONS;
module.exports.PROPERTY_DIVISIONS_LIST = PROPERTY_DIVISIONS_LIST;
module.exports.PROPERTY_TYPES_LIST = PROPERTY_TYPES_LIST;
