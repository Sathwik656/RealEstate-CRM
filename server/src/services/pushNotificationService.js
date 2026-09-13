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

const Notification = require('../models/Notification');

// ─── Save Notification to DB ────────────────────────────────────────────────────

const saveToDb = async (userIds, payload, type) => {
  if (!userIds || !userIds.length) return;
  const dbNotifications = userIds.map((userId) => ({
    recipient: userId,
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/logo.png',
    url: payload.data?.url || '/',
    type,
  }));
  await Notification.insertMany(dbNotifications).catch((e) => console.error('DB Notification save error:', e));
};

// ─── Send Notification to a Single Subscription ─────────────────────────────────

/**
 * Send a push notification to a specific subscription.
 * Returns true on success, false if the subscription should be removed.
 */
const sendToSubscription = async (subscription, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
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
    if (err.statusCode === 410 || err.statusCode === 404) {
      await PushSubscription.findByIdAndDelete(subscription._id);
      return false;
    }
    return false;
  }
};

// ─── Send Notification to a Single User (All Devices) ────────────────────────────

/**
 * Send a push notification to all active subscriptions of a user.
 */
const sendNotificationToUser = async (userId, payload) => {
  const subscriptions = await PushSubscription.find({ userId });
  if (!subscriptions.length) return { sent: 0, failed: 0 };

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
    // Find all active users (agents and admins), excluding the creator
    // We notify them even if push is disabled so they get it in their in-app history.
    const eligibleUsers = await User.find({ _id: { $ne: excludeUserId } }).select('_id notificationsEnabled');
    if (!eligibleUsers.length) return;

    const locationName = property.location?.location || '';
    const locationCode = property.location?.code || '';
    const locationDisplay = locationCode ? `${locationName} (${locationCode})` : locationName;
    const priceDisplay = property.price ? `₹${property.price.toLocaleString('en-IN')}` : '';

    const payload = {
      title: 'New Property Added',
      body: [property.propertyTitle, locationDisplay, priceDisplay].filter(Boolean).join('\n'),
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: {
        propertyCode: property.code || property.propertyId,
        url: `/properties/${property.code || property.propertyId}`,
      },
    };

    // Save to DB for everyone
    await saveToDb(eligibleUsers.map(u => u._id), payload, 'PROPERTY_CREATED');

    // Push to those who have push enabled
    const pushUsers = eligibleUsers.filter(u => u.notificationsEnabled);
    await Promise.allSettled(pushUsers.map((user) => sendNotificationToUser(user._id, payload)));
  } catch (err) {
    console.error('Error sending push notifications:', err);
  }
};

// ─── Add Specific Notification Helpers ──────────────────────────────────────────

const notifyAgentInterested = async (property, agent) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id notificationsEnabled');
    if (!admins.length) return;

    const payload = {
      title: 'New Property Interest',
      body: `${agent.name || agent.email} is interested in ${property.propertyTitle} (${property.code || property.propertyId})`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/allotments' },
    };

    await saveToDb(admins.map(a => a._id), payload, 'AGENT_INTERESTED');
    const pushAdmins = admins.filter(a => a.notificationsEnabled);
    await Promise.allSettled(pushAdmins.map(a => sendNotificationToUser(a._id, payload)));
  } catch (err) {
    console.error('notifyAgentInterested error:', err);
  }
};

const notifyPropertyAssigned = async (property, agentId) => {
  try {
    const agent = await User.findById(agentId).select('_id notificationsEnabled');
    if (!agent) return;

    const payload = {
      title: 'Property Assigned',
      body: `You have been assigned ${property.propertyTitle} (${property.code || property.propertyId}). Check your ongoing deals.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb([agent._id], payload, 'PROPERTY_ASSIGNED');
    if (agent.notificationsEnabled) {
      await sendNotificationToUser(agent._id, payload);
    }
  } catch (err) {
    console.error('notifyPropertyAssigned error:', err);
  }
};

const notifyDealCompleted = async (deal, property, agent) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id notificationsEnabled');
    if (!admins.length) return;

    const payload = {
      title: 'Deal Completed',
      body: `${agent.name || agent.email} has completed the deal for ${property.propertyTitle} (${property.code || property.propertyId}). Awaiting your approval.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deal-approvals' },
    };

    await saveToDb(admins.map(a => a._id), payload, 'DEAL_COMPLETED');
    const pushAdmins = admins.filter(a => a.notificationsEnabled);
    await Promise.allSettled(pushAdmins.map(a => sendNotificationToUser(a._id, payload)));
  } catch (err) {
    console.error('notifyDealCompleted error:', err);
  }
};

const notifyDealApproved = async (deal, property, agentId) => {
  try {
    const agent = await User.findById(agentId).select('_id notificationsEnabled');
    if (!agent) return;

    const payload = {
      title: 'Deal Approved',
      body: `Your deal for ${property.propertyTitle} (${property.code || property.propertyId}) has been approved.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb([agent._id], payload, 'DEAL_APPROVED');
    if (agent.notificationsEnabled) {
      await sendNotificationToUser(agent._id, payload);
    }
  } catch (err) {
    console.error('notifyDealApproved error:', err);
  }
};

module.exports = {
  sendNotificationToUser,
  notifyAllEligibleAgents,
  notifyAgentInterested,
  notifyPropertyAssigned,
  notifyDealCompleted,
  notifyDealApproved,
};
