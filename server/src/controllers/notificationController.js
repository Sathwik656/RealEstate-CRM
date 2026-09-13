'use strict';
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const Notification = require('../models/Notification');

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

// ─── GET /api/notifications ──────────────────────────────────────────────────

/**
 * Get all notifications for the authenticated user
 */
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { recipient: req.user._id };
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: {
        notifications,
        unreadCount,
      },
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

/**
 * Mark a single notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

/**
 * Mark all unread notifications as read for the user
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
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
  getNotifications,
  markAsRead,
  markAllAsRead,
};
