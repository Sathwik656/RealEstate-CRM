'use strict';
const mongoose = require('mongoose');

const rentalPropertySchema = new mongoose.Schema(
  {
    propertyRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      index: true,
    },
    area: {
      type: Number,
      min: [0, 'Area cannot be negative'],
    },
    bhk: {
      type: Number,
      enum: [1, 2, 3, 4, 5, null],
      default: null,
      index: true,
    },
    furnishing: {
      type: String,
      enum: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'],
      index: true,
    },
    rentAmount: {
      type: Number,
      required: [true, 'Rent amount is required'],
      min: [0, 'Rent amount cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      min: [0, 'Security deposit cannot be negative'],
    },
    parkingAvailable: {
      type: Boolean,
      default: false,
    },
    availableFrom: {
      type: Date,
    },
    propertyStatus: {
      type: String,
      enum: ['Available', 'Occupied'],
      default: 'Available',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

rentalPropertySchema.index({ createdAt: -1 });

module.exports = mongoose.model('RentalProperty', rentalPropertySchema);
