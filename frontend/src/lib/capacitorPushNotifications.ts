import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from './api';

/**
 * Initializes FCM push notifications for native (Android/iOS) platforms.
 *
 * IMPORTANT ORDER:
 *   1. Add all event listeners FIRST
 *   2. Check / request permission
 *   3. Call register() — this triggers the 'registration' event which
 *      delivers the FCM token. If listeners aren't set up before this
 *      call the token event is silently missed.
 */
export const setupCapacitorPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    // Web push (VAPID) handles browser notifications — skip FCM on web.
    return;
  }

  try {
    // ── Step 1: Register all listeners BEFORE calling register() ──────────

    // FCM token received — send it to our server so we can target this device
    PushNotifications.addListener('registration', async (token) => {
      console.log('[FCM] Registration success. Token:', token.value);
      try {
        await api.post('/notifications/fcm-token', { token: token.value });
        console.log('[FCM] Token saved to server successfully.');
      } catch (err) {
        console.error('[FCM] Failed to save token to server:', err);
      }
    });

    // FCM registration failed
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[FCM] Registration error:', JSON.stringify(error));
    });

    // Foreground notification received (app is open)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Notification received in foreground:', notification);
    });

    // User tapped on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[FCM] Notification action performed:', notification);
    });

    // ── Step 2: Check / request notification permission ───────────────────
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[FCM] Current permission status:', permStatus.receive);

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
      console.log('[FCM] Permission after request:', permStatus.receive);
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[FCM] Push notification permission denied by user.');
      return;
    }

    // ── Step 3: Register with FCM — fires 'registration' event with token ─
    await PushNotifications.register();
    console.log('[FCM] Registration initiated.');

  } catch (error) {
    console.error('[FCM] Error initializing push notifications:', error);
  }
};

// Kept for backwards compat — delegates to the unified setup function.
export const registerPushNotificationListeners = setupCapacitorPushNotifications;
