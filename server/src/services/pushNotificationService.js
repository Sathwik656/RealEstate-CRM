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

const notifyAllEligibleAgents = async (property, excludeUserId) => {
  try {
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

    await saveToDb(eligibleUsers.map(u => u._id), payload, 'PROPERTY_CREATED');

    const pushUsers = eligibleUsers.filter(u => u.notificationsEnabled);
    await Promise.allSettled(pushUsers.map((user) => sendNotificationToUser(user._id, payload)));
  } catch (err) {
    console.error('Error sending push notifications:', err);
  }
};

// ─── Specific Notification Helpers ──────────────────────────────────────────────

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

    const agentName = agent?.name || agent?.email || 'Agent';
    const propertyLabel = `${property.propertyTitle} (${property.code || property.propertyId})`;

    const payload = {
      title: 'Deal Completed',
      body: `${agentName} has completed the deal for ${propertyLabel}. Awaiting your approval.`,
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

// ─── NEW: Unassignment & Reassignment Notifications ─────────────────────────────

/**
 * Notify all admins that an agent has requested unassignment.
 */
const notifyUnassignmentRequested = async (deal, property, agent) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id notificationsEnabled');
    if (!admins.length) return;

    const agentName = agent?.name || agent?.email || 'Agent';
    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Unassignment Request',
      body: `${agentName} has requested to be unassigned from ${propertyLabel}.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/allotments' },
    };

    await saveToDb(admins.map(a => a._id), payload, 'UNASSIGN_REQUESTED');
    const pushAdmins = admins.filter(a => a.notificationsEnabled);
    await Promise.allSettled(pushAdmins.map(a => sendNotificationToUser(a._id, payload)));
  } catch (err) {
    console.error('notifyUnassignmentRequested error:', err);
  }
};

/**
 * Notify an agent that a property has been reassigned to them.
 */
const notifyPropertyReassigned = async (property, newAgentId) => {
  try {
    const agent = await User.findById(newAgentId).select('_id notificationsEnabled');
    if (!agent) return;

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Property Reassigned to You',
      body: `You have been assigned ${propertyLabel}. Check your ongoing deals.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb([agent._id], payload, 'PROPERTY_REASSIGNED');
    if (agent.notificationsEnabled) {
      await sendNotificationToUser(agent._id, payload);
    }
  } catch (err) {
    console.error('notifyPropertyReassigned error:', err);
  }
};

/**
 * Notify an agent that their assignment has been ended by admin.
 */
const notifyAgentUnassigned = async (property, oldAgentId) => {
  try {
    const agent = await User.findById(oldAgentId).select('_id notificationsEnabled');
    if (!agent) return;

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Assignment Ended',
      body: `Your assignment to ${propertyLabel} has been ended by an administrator.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb([agent._id], payload, 'AGENT_UNASSIGNED');
    if (agent.notificationsEnabled) {
      await sendNotificationToUser(agent._id, payload);
    }
  } catch (err) {
    console.error('notifyAgentUnassigned error:', err);
  }
};

/**
 * Notify all admins that an agent has submitted a property for approval.
 */
const notifyAdminsPendingProperty = async (property, agent) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id notificationsEnabled');
    if (!admins.length) return;

    const agentName = agent?.name || 'An agent';
    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Property Awaiting Approval',
      body: `${agentName} has submitted ${propertyLabel} for approval. Please review it.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/properties?filter=pending' },
    };

    await saveToDb(admins.map(a => a._id), payload, 'PROPERTY_PENDING_APPROVAL');
    const pushAdmins = admins.filter(a => a.notificationsEnabled);
    await Promise.allSettled(pushAdmins.map(a => sendNotificationToUser(a._id, payload)));
  } catch (err) {
    console.error('notifyAdminsPendingProperty error:', err);
  }
};

/**
 * Notify the creating agent that their submitted property has been approved by an admin.
 */
const notifyAgentPropertyApproved = async (property, agentId) => {
  try {
    const agent = await User.findById(agentId).select('_id notificationsEnabled');
    if (!agent) return;

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'Your property';

    const payload = {
      title: 'Property Approved!',
      body: `${propertyLabel} has been approved and is now visible to all agents.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: `/properties/${property.code || property.propertyId}` },
    };

    await saveToDb([agent._id], payload, 'PROPERTY_APPROVED');
    if (agent.notificationsEnabled) {
      await sendNotificationToUser(agent._id, payload);
    }
  } catch (err) {
    console.error('notifyAgentPropertyApproved error:', err);
  }
};

/**
 * Notify an Agent or Admin about a Buyer follow-up reminder.
 */
const notifyBuyerReminder = async (buyer) => {
  try {
    const creatorId = buyer.createdByUserId;
    if (!creatorId) return;

    const user = await User.findById(creatorId).select('_id notificationsEnabled');
    if (!user) return;

    const payload = {
      title: 'Next follow-up',
      body: `Follow up with Buyer: ${buyer.buyerName}`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: `/buyers/${buyer._id}` },
    };

    await saveToDb([user._id], payload, 'BUYER_REMINDER');
    if (user.notificationsEnabled) {
      await sendNotificationToUser(user._id, payload);
    }
  } catch (err) {
    console.error('notifyBuyerReminder error:', err);
  }
};

module.exports = {
  sendNotificationToUser,
  notifyAllEligibleAgents,
  notifyAgentInterested,
  notifyPropertyAssigned,
  notifyDealCompleted,
  notifyDealApproved,
  // New
  notifyUnassignmentRequested,
  notifyPropertyReassigned,
  notifyAgentUnassigned,
  notifyAdminsPendingProperty,
  notifyAgentPropertyApproved,
  notifyBuyerReminder,
};
