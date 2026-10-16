
'use strict';

const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const {
  sendPushNotification,
} = require('./firebaseNotificationService');
const Notification = require('../models/Notification');

// Initialize Web Push.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@veenucrm.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  console.log('[WebPush] VAPID configured.');
} else {
  console.warn(
    '[WebPush] VAPID keys missing; browser push is disabled.'
  );
}

// Save in-app notifications.
const saveToDb = async (userIds, payload, type) => {
  if (!userIds?.length) return;

  const docs = userIds.map((userId) => ({
    recipient: userId,
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/logo.png',
    url: payload.data?.url || '/',
    type,
  }));

  try {
    await Notification.insertMany(docs);
  } catch (error) {
    console.error(
      '[Notify] Failed to save in-app notifications:',
      error.message
    );
  }
};

// Send a Web Push notification to one browser subscription.
const sendToSubscription = async (subscription, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return false;
  }

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
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      try {
        await PushSubscription.findByIdAndDelete(subscription._id);
      } catch (cleanupError) {
        console.error(
          '[WebPush] Failed to remove expired subscription:',
          cleanupError.message
        );
      }

      return false;
    }

    console.error(
      '[WebPush] Delivery failed:',
      error.statusCode || '',
      error.message
    );

    return false;
  }
};

/**
 * Send Web Push and FCM notifications to one user.
 * FCM delivery does not depend on notificationsEnabled.
 */
const sendNotificationToUser = async (userId, payload) => {
  let webSent = 0;
  let webFailed = 0;
  let fcmSent = 0;
  let fcmFailed = 0;

  // 1. Browser/Web Push.
  try {
    const subscriptions = await PushSubscription.find({ userId });

    const webResults = await Promise.allSettled(
      subscriptions.map((subscription) =>
        sendToSubscription(subscription, payload)
      )
    );

    webResults.forEach((result) => {
      if (
        result.status === 'fulfilled' &&
        result.value === true
      ) {
        webSent += 1;
      } else {
        webFailed += 1;
      }
    });
  } catch (error) {
    console.error(
      `[Notify] Web Push lookup failed for user ${String(userId)}:`,
      error.message
    );

    webFailed += 1;
  }

  // 2. Firebase Cloud Messaging.
  try {
    const result = await sendPushNotification({
      userIds: [userId],
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });

    fcmSent = result.sent || 0;
    fcmFailed = result.failed || 0;

    if (result.skipped) {
      console.warn(
        `[Notify] FCM skipped for user ${String(userId)}: ` +
        `${result.reason || 'unknown reason'}.`
      );
    }
  } catch (error) {
    console.error(
      `[Notify] FCM integration failed for user ${String(userId)}:`,
      error.message
    );

    fcmFailed += 1;
  }

  return {
    sent: webSent + fcmSent,
    failed: webFailed + fcmFailed,
    webSent,
    webFailed,
    fcmSent,
    fcmFailed,
  };
};

// Notify all non-creator users when a property is created.
const notifyAllEligibleAgents = async (property, excludeUserId) => {
  try {
    const userFilter = excludeUserId
      ? { _id: { $ne: excludeUserId } }
      : {};

    const allUsers = await User.find(userFilter).select(
      '_id notificationsEnabled fcmTokens'
    );

    console.log(
      `[Notify] Property-created event: ${allUsers.length} ` +
      'non-creator user(s) considered.'
    );

    if (!allUsers.length) {
      console.warn('[Notify] No users eligible for notification.');

      return {
        sent: 0,
        failed: 0,
        recipients: 0,
      };
    }

    const locationName = property.location?.location || '';
    const locationCode = property.location?.code || '';

    const locationDisplay = locationCode
      ? `${locationName} (${locationCode})`
      : locationName;

    const priceDisplay = property.price
      ? `₹${Number(property.price).toLocaleString('en-IN')}`
      : '';

    const propertyId =
      property.code ||
      property.propertyId ||
      String(property._id || '');

    const payload = {
      title: 'New Property Listed',
      body: [
        property.propertyTitle,
        locationDisplay,
        priceDisplay,
      ].filter(Boolean).join(' · '),
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: {
        propertyCode: propertyId,
        url: `/properties/${propertyId}`,
      },
    };

    // Save in-app notifications independently of push eligibility.
    await saveToDb(
      allUsers.map((user) => user._id),
      payload,
      'PROPERTY_CREATED'
    );

    console.log(
      `[Notify] In-app notifications attempted for ${allUsers.length} user(s).`
    );

    // Browser subscribers.
    const webPushUsers = allUsers.filter(
      (user) => user.notificationsEnabled
    );

    // Android/iOS users with stored FCM device tokens.
    const fcmUsers = allUsers.filter(
      (user) =>
        Array.isArray(user.fcmTokens) &&
        user.fcmTokens.length > 0
    );

    // Deduplicate users who have both delivery methods.
    const targetIds = new Set([
      ...webPushUsers.map((user) => String(user._id)),
      ...fcmUsers.map((user) => String(user._id)),
    ]);

    const pushTargets = allUsers.filter(
      (user) => targetIds.has(String(user._id))
    );

    console.log(
      `[Notify] Eligible recipients: ${pushTargets.length}; ` +
      `web opted-in: ${webPushUsers.length}; ` +
      `users with FCM tokens: ${fcmUsers.length}.`
    );

    if (!pushTargets.length) {
      console.warn(
        '[Notify] In-app notification saved, but no users have ' +
        'eligible Web Push subscriptions or FCM tokens.'
      );

      return {
        sent: 0,
        failed: 0,
        recipients: 0,
      };
    }

    const results = await Promise.allSettled(
      pushTargets.map((user) =>
        sendNotificationToUser(user._id, payload)
      )
    );

    let sent = 0;
    let failed = 0;

    results.forEach((result, index) => {
      const recipientId = String(pushTargets[index]._id);

      if (result.status === 'fulfilled') {
        sent += result.value.sent;
        failed += result.value.failed;

        console.log(
          `[Notify] Recipient ${recipientId}: ` +
          `sent=${result.value.sent}, ` +
          `failed=${result.value.failed}, ` +
          `FCM sent=${result.value.fcmSent}, ` +
          `FCM failed=${result.value.fcmFailed}.`
        );
      } else {
        failed += 1;

        console.error(
          `[Notify] Push workflow rejected for recipient ${recipientId}:`,
          result.reason?.message || result.reason
        );
      }
    });

    console.log(
      `[Notify] Property notification complete — ` +
      `recipients: ${pushTargets.length}, sent: ${sent}, failed: ${failed}.`
    );

    return {
      sent,
      failed,
      recipients: pushTargets.length,
    };
  } catch (error) {
    console.error(
      '[Notify] Error in notifyAllEligibleAgents:',
      error.message
    );

    return {
      sent: 0,
      failed: 1,
      error: error.message,
    };
  }
};

// Notify admins when an agent expresses interest in a property.
const notifyAgentInterested = async (property, agent) => {
  try {
    const admins = await User.find({ role: 'admin' }).select(
      '_id fcmTokens'
    );

    if (!admins.length) return;

    const payload = {
      title: 'New Property Interest',
      body:
        `${agent.name || agent.email} is interested in ` +
        `${property.propertyTitle} (${property.code || property.propertyId})`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/allotments' },
    };

    await saveToDb(
      admins.map((user) => user._id),
      payload,
      'AGENT_INTERESTED'
    );

    await Promise.allSettled(
      admins.map((user) =>
        sendNotificationToUser(user._id, payload)
      )
    );
  } catch (error) {
    console.error(
      '[Notify] notifyAgentInterested failed:',
      error.message
    );
  }
};

// Notify the assigned agent.
const notifyPropertyAssigned = async (property, agentId) => {
  try {
    const agent = await User.findById(agentId).select(
      '_id fcmTokens'
    );

    if (!agent) return;

    const payload = {
      title: 'Property Assigned',
      body:
        `You have been assigned ${property.propertyTitle} ` +
        `(${property.code || property.propertyId}). Check your ongoing deals.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb(
      [agent._id],
      payload,
      'PROPERTY_ASSIGNED'
    );

    await sendNotificationToUser(agent._id, payload);
  } catch (error) {
    console.error(
      '[Notify] notifyPropertyAssigned failed:',
      error.message
    );
  }
};

// Notify admins when an agent completes a deal.
const notifyDealCompleted = async (deal, property, agent) => {
  try {
    const admins = await User.find({ role: 'admin' }).select(
      '_id fcmTokens'
    );

    if (!admins.length) return;

    const payload = {
      title: 'Deal Completed',
      body:
        `${agent?.name || agent?.email || 'Agent'} has completed ` +
        `the deal for ${property.propertyTitle} ` +
        `(${property.code || property.propertyId}). Awaiting your approval.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deal-approvals' },
    };

    await saveToDb(
      admins.map((user) => user._id),
      payload,
      'DEAL_COMPLETED'
    );

    await Promise.allSettled(
      admins.map((user) =>
        sendNotificationToUser(user._id, payload)
      )
    );
  } catch (error) {
    console.error(
      '[Notify] notifyDealCompleted failed:',
      error.message
    );
  }
};

// Notify the agent when a deal is approved.
const notifyDealApproved = async (deal, property, agentId) => {
  try {
    const agent = await User.findById(agentId).select(
      '_id fcmTokens'
    );

    if (!agent) return;

    const payload = {
      title: 'Deal Approved',
      body:
        `Your deal for ${property.propertyTitle} ` +
        `(${property.code || property.propertyId}) has been approved.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb(
      [agent._id],
      payload,
      'DEAL_APPROVED'
    );

    await sendNotificationToUser(agent._id, payload);
  } catch (error) {
    console.error(
      '[Notify] notifyDealApproved failed:',
      error.message
    );
  }
};

// Notify admins about an unassignment request.
const notifyUnassignmentRequested = async (
  deal,
  property,
  agent
) => {
  try {
    const admins = await User.find({ role: 'admin' }).select(
      '_id fcmTokens'
    );

    if (!admins.length) return;

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Unassignment Request',
      body:
        `${agent?.name || agent?.email || 'An agent'} has requested ` +
        `to be unassigned from ${propertyLabel}.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/allotments' },
    };

    await saveToDb(
      admins.map((user) => user._id),
      payload,
      'UNASSIGN_REQUESTED'
    );

    await Promise.allSettled(
      admins.map((user) =>
        sendNotificationToUser(user._id, payload)
      )
    );
  } catch (error) {
    console.error(
      '[Notify] notifyUnassignmentRequested failed:',
      error.message
    );
  }
};

// Notify an agent when a property is reassigned to them.
const notifyPropertyReassigned = async (
  property,
  newAgentId
) => {
  try {
    const agent = await User.findById(newAgentId).select(
      '_id fcmTokens'
    );

    if (!agent) return;

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Property Reassigned to You',
      body:
        `You have been assigned ${propertyLabel}. ` +
        'Check your ongoing deals.',
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb(
      [agent._id],
      payload,
      'PROPERTY_REASSIGNED'
    );

    await sendNotificationToUser(agent._id, payload);
  } catch (error) {
    console.error(
      '[Notify] notifyPropertyReassigned failed:',
      error.message
    );
  }
};

// Notify an agent when their assignment ends.
const notifyAgentUnassigned = async (
  property,
  oldAgentId
) => {
  try {
    const agent = await User.findById(oldAgentId).select(
      '_id fcmTokens'
    );

    if (!agent) return;

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Assignment Ended',
      body:
        `Your assignment to ${propertyLabel} has been ended ` +
        'by an administrator.',
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/deals' },
    };

    await saveToDb(
      [agent._id],
      payload,
      'AGENT_UNASSIGNED'
    );

    await sendNotificationToUser(agent._id, payload);
  } catch (error) {
    console.error(
      '[Notify] notifyAgentUnassigned failed:',
      error.message
    );
  }
};

// Notify admins about a property awaiting approval.
const notifyAdminsPendingProperty = async (
  property,
  agent
) => {
  try {
    const admins = await User.find({ role: 'admin' }).select(
      '_id fcmTokens'
    );

    if (!admins.length) return;

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'a property';

    const payload = {
      title: 'Property Awaiting Approval',
      body:
        `${agent?.name || 'An agent'} has submitted ${propertyLabel} ` +
        'for approval. Please review it.',
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: '/properties?filter=pending' },
    };

    await saveToDb(
      admins.map((user) => user._id),
      payload,
      'PROPERTY_PENDING_APPROVAL'
    );

    await Promise.allSettled(
      admins.map((user) =>
        sendNotificationToUser(user._id, payload)
      )
    );
  } catch (error) {
    console.error(
      '[Notify] notifyAdminsPendingProperty failed:',
      error.message
    );
  }
};

// Notify the agent that their property has been approved.
const notifyAgentPropertyApproved = async (
  property,
  agentId
) => {
  try {
    const agent = await User.findById(agentId).select(
      '_id fcmTokens'
    );

    if (!agent) return;

    const propertyId =
      property.code ||
      property.propertyId ||
      String(property._id || '');

    const propertyLabel = property?.propertyTitle
      ? `${property.propertyTitle} (${property.code || ''})`
      : 'Your property';

    const payload = {
      title: 'Property Approved!',
      body:
        `${propertyLabel} has been approved and is now visible to all agents.`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: `/properties/${propertyId}` },
    };

    await saveToDb(
      [agent._id],
      payload,
      'PROPERTY_APPROVED'
    );

    await sendNotificationToUser(agent._id, payload);
  } catch (error) {
    console.error(
      '[Notify] notifyAgentPropertyApproved failed:',
      error.message
    );
  }
};

// Notify the creator of a buyer record about a follow-up.
const notifyBuyerReminder = async (buyer) => {
  try {
    const creatorId = buyer.createdByUserId;

    if (!creatorId) return;

    const user = await User.findById(creatorId).select(
      '_id fcmTokens'
    );

    if (!user) return;

    const payload = {
      title: 'Next follow-up',
      body: `Follow up with Buyer: ${buyer.buyerName}`,
      icon: '/logo.png',
      badge: '/notification-badge.png',
      data: { url: `/buyers/${buyer._id}` },
    };

    await saveToDb(
      [user._id],
      payload,
      'BUYER_REMINDER'
    );

    await sendNotificationToUser(user._id, payload);
  } catch (error) {
    console.error(
      '[Notify] notifyBuyerReminder failed:',
      error.message
    );
  }
};

module.exports = {
  sendNotificationToUser,
  notifyAllEligibleAgents,
  notifyAgentInterested,
  notifyPropertyAssigned,
  notifyDealCompleted,
  notifyDealApproved,
  notifyUnassignmentRequested,
  notifyPropertyReassigned,
  notifyAgentUnassigned,
  notifyAdminsPendingProperty,
  notifyAgentPropertyApproved,
  notifyBuyerReminder,
};