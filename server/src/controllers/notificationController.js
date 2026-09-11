'use strict';
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

// ─── GET /api/notifications/settings ─────────────────────────────────────────

/**
 * Get the notification settings for the authenticated user.
 * Returns the notification preference and VAPID public key.
 */
const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notificationsEnabled');
    const subscriptionCount = await PushSubscription.countDocuments({ userId: req.user._id });

    return res.status(200).json({
      success: true,
      data: {
        notificationsEnabled: user.notificationsEnabled || false,
        subscriptionCount,
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/notifications/settings ─────────────────────────────────────────

/**
 * Update the notification preference for the authenticated user.
 * When disabling, also removes all push subscriptions for the user.
 */
const updateSettings = async (req, res, next) => {
  try {
    const { notificationsEnabled } = req.body;

    if (typeof notificationsEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'notificationsEnabled must be a boolean value',
      });
    }

    await User.findByIdAndUpdate(req.user._id, { notificationsEnabled });

    // If disabling, remove all subscriptions for this user
    if (!notificationsEnabled) {
      await PushSubscription.deleteMany({ userId: req.user._id });
    }

    return res.status(200).json({
      success: true,
      message: notificationsEnabled
        ? 'Push notifications enabled'
        : 'Push notifications disabled',
      data: { notificationsEnabled },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/notifications/subscribe ───────────────────────────────────────

/**
 * Subscribe the current device/browser to push notifications.
 * Upserts by endpoint so re-subscribing from the same browser updates rather than duplicates.
 * Also enables notifications on the user record.
 */
const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;

    // Validate subscription payload
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid push subscription. Required: endpoint, keys.p256dh, keys.auth',
      });
    }

    // Validate endpoint is a URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid endpoint URL in push subscription',
      });
    }

    // Upsert the subscription (update if same endpoint exists for any user, create if new)
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Enable notifications on the user
    await User.findByIdAndUpdate(req.user._id, { notificationsEnabled: true });

    return res.status(201).json({
      success: true,
      message: 'Push subscription registered successfully',
    });
  } catch (err) {
    // Handle duplicate key error gracefully
    if (err.code === 11000) {
      return res.status(200).json({
        success: true,
        message: 'Push subscription already registered',
      });
    }
    next(err);
  }
};

// ─── DELETE /api/notifications/unsubscribe ───────────────────────────────────

/**
 * Unsubscribe the current device/browser from push notifications.
 * If no more subscriptions remain, disable notifications on the user.
 */
const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required to unsubscribe',
      });
    }

    // Only remove the subscription if it belongs to the authenticated user
    const result = await PushSubscription.findOneAndDelete({
      endpoint,
      userId: req.user._id,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or does not belong to you',
      });
    }

    // Check if user has any remaining subscriptions
    const remainingCount = await PushSubscription.countDocuments({ userId: req.user._id });
    if (remainingCount === 0) {
      await User.findByIdAndUpdate(req.user._id, { notificationsEnabled: false });
    }

    return res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  subscribe,
  unsubscribe,
};
