'use strict';
const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    endpoint: {
      type: String,
      required: [true, 'Push subscription endpoint is required'],
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, 'p256dh key is required'],
      },
      auth: {
        type: String,
        required: [true, 'Auth key is required'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups by user + endpoint
pushSubscriptionSchema.index({ userId: 1, endpoint: 1 });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
