
'use strict';

const { initializeApp, getApps, applicationDefault, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const User = require('../models/User');

try {
    if (getApps().length === 0) {
        const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !rawKey) {
            throw new Error('Firebase Admin environment variables are missing.');
        }

        const privateKey = rawKey.replace(/\\n/g, '\n').trim();

        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            projectId,
        });

        console.log('[FCM] Firebase Admin initialized successfully.');
    }
} catch (error) {
    console.error('[FCM] Initialization error:', error.stack || error.message);
}



const CHUNK_SIZE = 500;

const isInvalidTokenError = (code) =>
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/registration-token-not-registered';

/**
 * Send FCM notifications to registered devices belonging to userIds.
 * Never log registration-token values.
 */
const sendPushNotification = async (options = {}) => {
    const {
        userIds = [],
        title = '',
        body = '',
        data,
    } = options || {};

    if (!options || !Array.isArray(options.userIds) || options.userIds.length === 0) {
        console.error(
            '[FCM] Invalid or missing userIds. Cannot send notification.',
            {
                hasOptions: Boolean(options),
                userIdsType: typeof userIds,
            }
        );

        return {
            sent: 0,
            failed: 0,
            skipped: true,
            reason: 'invalid-or-empty-userIds',
        };
    }
    if (getApps().length === 0) {
        console.error(
            '[FCM] Send skipped: Firebase Admin is not initialized.'
        );

        return {
            sent: 0,
            failed: userIds.length,
            skipped: true,
            reason: 'firebase-not-initialized',
        };
    }

    try {
        const users = await User.find({
            _id: { $in: userIds },
        }).select('_id email fcmTokens');

        console.log(`[FCM Diagnostic] Looking up ${userIds.length} user ID(s):`, userIds);
        console.log(`[FCM Diagnostic] Found ${users.length} user record(s) in DB.`);
        users.forEach(u => {
            console.log(`[FCM Diagnostic] User ${u._id} (${u.email}): has ${(u.fcmTokens || []).length} token(s).`);
        });

        // Map unique tokens to avoid duplicate sends.
        const tokenOwners = new Map();

        for (const user of users) {
            for (const rawToken of user.fcmTokens || []) {
                if (typeof rawToken !== 'string' || !rawToken.trim()) {
                    continue;
                }

                const token = rawToken.trim();

                if (!tokenOwners.has(token)) {
                    tokenOwners.set(token, new Set());
                }

                tokenOwners.get(token).add(String(user._id));
            }
        }

        const tokens = [...tokenOwners.keys()];

        if (tokens.length === 0) {
            console.warn(
                `[FCM] No stored FCM tokens found for ${users.length} matched user(s).`
            );

            return {
                sent: 0,
                failed: 0,
                skipped: true,
                reason: 'no-tokens',
            };
        }

        const message = {
            notification: {
                title: String(title || ''),
                body: String(body || ''),
            },
            android: {
                notification: {
                    sound: 'default',
                    channelId: 'fcm_default_channel',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                },
            },
            tokens: [],
        };

        // FCM data payload values must be strings.
        if (data && typeof data === 'object') {
            message.data = {};

            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined && value !== null) {
                    message.data[key] = String(value);
                }
            }
        }

        let sent = 0;
        let failed = 0;
        const tokensToRemove = new Set();

        // FCM multicast accepts at most 500 tokens per request.
        for (let offset = 0; offset < tokens.length; offset += CHUNK_SIZE) {
            const batch = tokens.slice(offset, offset + CHUNK_SIZE);

            console.log(
                `[FCM] Sending batch ${Math.floor(offset / CHUNK_SIZE) + 1
                }: ${batch.length} device token(s).`
            );

            const response = await getMessaging().sendEachForMulticast({
                ...message,
                tokens: batch,
            });

            sent += response.successCount;
            failed += response.failureCount;

            response.responses.forEach((result, index) => {
                if (result.success) return;

                const code = result.error?.code || 'unknown';

                console.error(
                    `[FCM] Send failed for token ${offset + index + 1}/${tokens.length}: ` +
                    `${code} — ${result.error?.message || 'No error message'}`
                );

                if (isInvalidTokenError(code)) {
                    tokensToRemove.add(batch[index]);
                }
            });
        }

        // Remove invalid or expired device tokens from MongoDB.
        if (tokensToRemove.size > 0) {
            const invalidTokens = [...tokensToRemove];

            const cleanup = await User.updateMany(
                { fcmTokens: { $in: invalidTokens } },
                {
                    $pull: {
                        fcmTokens: { $in: invalidTokens },
                    },
                }
            );

            console.log(
                `[FCM] Removed ${invalidTokens.length} invalid token(s) from ` +
                `${cleanup.modifiedCount ?? cleanup.nModified ?? 0} user record(s).`
            );
        }

        console.log(
            `[FCM] Send operation finished: ${sent} accepted, ` +
            `${failed} failed, ${tokens.length} unique token(s).`
        );

        return {
            sent,
            failed,
            skipped: false,
            tokenCount: tokens.length,
        };
    } catch (error) {
        console.error(
            '[FCM] Unexpected send failure:',
            error.code || '',
            error.message
        );

        return {
            sent: 0,
            failed: 1,
            skipped: false,
            reason: error.code || 'send-error',
        };
    }
};

module.exports = {
    sendPushNotification,
};
