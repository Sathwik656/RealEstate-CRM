'use strict';
const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema(
  {
    leaseId: {
      type: String,
      unique: true,
      index: true,
    },
    propertyRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
      index: true,
    },
    landlordName: {
      type: String,
      required: [true, 'Landlord name is required'],
      trim: true,
    },
    tenantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    tenantName: {
      type: String,
      trim: true,
    },
    leaseStartDate: {
      type: Date,
      required: [true, 'Lease start date is required'],
    },
    leaseEndDate: {
      type: Date,
      required: [true, 'Lease end date is required'],
    },
    leaseAmount: {
      type: Number,
      required: [true, 'Lease amount is required'],
      min: [0, 'Lease amount cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      min: [0, 'Security deposit cannot be negative'],
    },
    renewalDate: {
      type: Date,
    },
    agreementDocument: {
      type: String, // file path
    },
    status: {
      type: String,
      enum: ['Active', 'Expired', 'Renewed'],
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

leaseSchema.index({ leaseEndDate: 1 });
leaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lease', leaseSchema);
