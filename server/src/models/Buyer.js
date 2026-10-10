'use strict';
const mongoose = require('mongoose');

const Property = require('./Property');

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
    preferredPropertyDivisions: [{
      type: String,
      enum: Property.PROPERTY_DIVISIONS_LIST,
    }],
    preferredPropertyTypes: [{
      type: String,
      enum: Property.PROPERTY_TYPES_LIST,
    }],
    purpose: {
      type: String,
      enum: ['Purchase', 'Rent'],
      required: [true, 'Purpose is required'],
      index: true,
    },
    /* Not used currently */
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
    minArea: {
      type: Number,
      min: [0, 'Area minimum cannot be negative'],
    },
    maxArea: {
      type: Number,
      min: [0, 'Area maximum cannot be negative'],
    },
    bhkRequirement: {
      type: Number,
      enum: [1, 2, 3, 4, 5, null],
      default: null,
      index: true,
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          const types = this.preferredPropertyTypes || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.preferredPropertyTypes) || (this.getUpdate && this.getUpdate().preferredPropertyTypes);
          if (!types || types.length === 0) return true;
          
          const allowedTypes = ['Independent House', 'Flat / Apartment', 'Villa', 'Duplex', 'Shop with Residence', 'Commercial Building with Residential Units', 'Farmhouse'];
          return types.some(t => allowedTypes.includes(t));
        },
        message: 'BHK requirement can only be set when interested in residential properties'
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
    reminderDate: {
      type: Date,
      default: null,
    },
    reminderStatus: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

buyerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Buyer', buyerSchema);
