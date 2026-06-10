'use strict';
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      unique: true,
      index: true,
    },
    tenantName: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    occupation: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    familyMembers: {
      type: Number,
      min: [1, 'Family members must be at least 1'],
    },
    preferredLocation: {
      type: String,
      trim: true,
      index: true,
    },
    budgetRange: {
      type: Number,
      min: [0, 'Budget range cannot be negative'],
    },
    bhkRequirement: {
      type: Number,
      enum: [1, 2, 3, 4, null],
      default: null,
      index: true,
    },
    moveInDate: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Tenant', tenantSchema);
