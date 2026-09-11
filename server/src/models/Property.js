'use strict';
const mongoose = require('mongoose');

const PROPERTY_TYPES = [
  'Land',
  'Shop',
  'Independent House',
  'Flat',
  'Store',
  'Garage'
];

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
    seqNumber: {
      type: Number,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      default: null,
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
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    bhk: {
      type: Number,
      enum: [1, 2, 3, 4, 5, null],
      default: null,
      index: true,
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          // In findOneAndUpdate, 'this' refers to the query
          const type = this.propertyType || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.propertyType) || (this.getUpdate && this.getUpdate().propertyType);
          // If type is not available in the payload during update, we can't strictly validate, but for save it works
          if (!type) return true;
          return ['Independent House', 'Flat'].includes(type);
        },
        message: 'BHK can only be assigned to Independent House and Flat'
      }
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
