'use strict';
const admin = require('firebase-admin');
const User = require('../models/User');

// Initialize Firebase Admin securely using environment variables
try {
  if (!admin.apps.length) {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines if passed via env var string
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      console.warn('Firebase Admin credentials not found in environment variables. FCM will not be sent.');
    }
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

/**
 * Send FCM notification to specific user(s)
 * @param {Object} params
 * @param {Array<String>} params.userIds Array of user IDs
 * @param {String} params.title Notification title
 * @param {String} params.body Notification body
 * @param {Object} [params.data] Optional notification data
 * @returns {Object} { sent, failed }
 */
const sendPushNotification = async ({ userIds, title, body, data }) => {
  if (!admin.apps.length) {
    console.warn('Firebase app not initialized, skipping FCM.');
    return { sent: 0, failed: 0 };
  }
  if (!userIds || !userIds.length) return { sent: 0, failed: 0 };

  try {
    // Find all target users to get their fcmTokens
    const users = await User.find({ _id: { $in: userIds } }).select('_id fcmTokens');
    
    const tokens = [];

    for (const user of users) {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        user.fcmTokens.forEach((token) => {
          tokens.push(token);
        });
      }
    }

    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Prepare message payload
    const message = {
      notification: {
        title,
        body,
      },
      tokens,
    };

    // Firebase data payload must be all strings
    if (data) {
      message.data = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          message.data[key] = String(value);
        }
      }
    }

    console.log(`Sending FCM notification to ${tokens.length} tokens...`);
    
    // In Firebase Admin v12+, sendMulticast is replaced by sendEachForMulticast
    const response = await admin.messaging().sendEachForMulticast(message);
    
    const sentCount = response.successCount;
    const failedCount = response.failureCount;

    // Handle invalid/expired tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(tokens[idx]);
          } else {
            console.error('FCM sending error:', resp.error);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log(`Removing ${tokensToRemove.length} invalid FCM tokens from DB`);
        await User.updateMany(
          { fcmTokens: { $in: tokensToRemove } },
          { $pull: { fcmTokens: { $in: tokensToRemove } } }
        );
      }
    }

    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('Error sending FCM notifications:', error);
    return { sent: 0, failed: 1 };
  }
};

module.exports = {
  sendPushNotification,
};
