'use strict';
const mongoose = require('mongoose');

/**
 * SellerProperty — junction collection for the Seller ↔ Property N:M relationship.
 *
 * A single seller can be associated with multiple properties, and a single property
 * can be associated with multiple sellers.  Each document records one link.
 * The compound unique index on { sellerId, propertyId } prevents duplicate links.
 */
const sellerPropertySchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Guarantee uniqueness: one seller cannot be linked to the same property twice
sellerPropertySchema.index({ sellerId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model('SellerProperty', sellerPropertySchema);
