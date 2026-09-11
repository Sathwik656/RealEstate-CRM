'use strict';
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

// ─── Initialize Web Push ────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@veenucrm.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('Web Push VAPID configured successfully');
} else {
  console.warn('VAPID keys not configured — push notifications will not work');
}

// ─── Send Notification to a Single Subscription ─────────────────────────────────

/**
 * Send a push notification to a specific subscription.
 * Returns true on success, false if the subscription should be removed.
 */
const sendToSubscription = async (subscription, payload) => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    // 410 Gone or 404 Not Found — subscription is expired/invalid
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`Removing expired subscription: ${subscription.endpoint.substring(0, 50)}...`);
      await PushSubscription.findByIdAndDelete(subscription._id);
      return false;
    }
    console.error(`Push notification failed for subscription ${subscription._id}:`, err.message);
    return false;
  }
};

// ─── Send Notification to a Single User (All Devices) ────────────────────────────

/**
 * Send a push notification to all active subscriptions of a user.
 */
const sendNotificationToUser = async (userId, payload) => {
  const subscriptions = await PushSubscription.find({ userId });

  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendToSubscription(sub, payload))
  );

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - sent;

  return { sent, failed };
};

// ─── Notify All Eligible Users ───────────────────────────────────────────────────

/**
 * Send push notifications for a new property to all users with notifications enabled.
 * Excludes the user who created the property (excludeUserId).
 */
const notifyAllEligibleAgents = async (property, excludeUserId) => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('Skipping push notifications — VAPID not configured');
      return;
    }

    // Find all users (agents AND admins) with notifications enabled, excluding the creator
    const eligibleUsers = await User.find({
      notificationsEnabled: true,
      _id: { $ne: excludeUserId },
    }).select('_id');

    if (!eligibleUsers.length) {
      console.log('No eligible users for push notification');
      return;
    }

    // Build notification payload with property info
    const locationName = property.location?.location || '';
    const locationCode = property.location?.code || '';
    const locationDisplay = locationCode ? `${locationName} (${locationCode})` : locationName;
    const priceDisplay = property.price
      ? `₹${property.price.toLocaleString('en-IN')}`
      : '';

    const payload = {
      title: 'New Property Added',
      body: [property.propertyTitle, locationDisplay, priceDisplay]
        .filter(Boolean)
        .join('\n'),
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: {
        propertyCode: property.code || property.propertyId,
        url: `/properties/${property.code || property.propertyId}`,
      },
    };

    // Send to all eligible users in parallel
    const results = await Promise.allSettled(
      eligibleUsers.map((user) => sendNotificationToUser(user._id, payload))
    );

    const totalSent = results.reduce((acc, r) => {
      if (r.status === 'fulfilled') return acc + r.value.sent;
      return acc;
    }, 0);

    console.log(
      `Push notifications sent: ${totalSent} devices across ${eligibleUsers.length} users for property ${property.code || property.propertyId}`
    );
  } catch (err) {
    console.error('Error sending push notifications:', err);
  }
};

module.exports = {
  sendNotificationToUser,
  notifyAllEligibleAgents,
};
