'use strict';
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: '/logo.png',
    },
    url: {
      type: String,
      default: '/',
    },
    type: {
      type: String,
      required: true, // e.g. 'PROPERTY_CREATED', 'AGENT_INTERESTED', 'PROPERTY_ASSIGNED', 'DEAL_COMPLETED', 'DEAL_APPROVED'
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
