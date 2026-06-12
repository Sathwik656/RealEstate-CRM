'use strict';
const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema(
  {
    sellerId: {
      type: String,
      unique: true,
      index: true,
    },
    sellerName: {
      type: String,
      required: [true, 'Seller name is required'],
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
    propertiesLinked: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
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

module.exports = mongoose.model('Seller', sellerSchema);
