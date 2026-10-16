import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '../lib/api';

/**
 * FCMHandler — mounts inside the router so it has access to `navigate`.
 *
 * CRITICAL ORDER (must not change):
 *   1. Add all PushNotifications listeners FIRST.
 *   2. Check / request notification permission.
 *   3. Call PushNotifications.register() — this triggers the 'registration'
 *      event that delivers the FCM token.  If listeners are not attached
 *      before this call the token event fires into the void and the device
 *      is never registered with the server.
 *
 * Returns null — renders nothing.
 */
export function FCMHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;

    const init = async () => {
      // ── Step 1: Attach all event listeners first ────────────────────────────

      // FCM token received — save it to the server so we can target this device
      await PushNotifications.addListener('registration', async (token) => {
        if (!mounted) return;
        console.log('[FCM] Registration success.');
        try {
          await api.post('/notifications/fcm-token', { token: token.value });
          console.log('[FCM] Token saved to server.');
        } catch (error) {
          console.error('[FCM] Error saving FCM token to server:', error);
        }
      });

      // FCM registration failure — log for debugging
      await PushNotifications.addListener('registrationError', (err) => {
        console.error('[FCM] Registration error:', err.error);
      });

      // Push received while app is in the foreground.
      // The system does NOT automatically show a heads-up notification when
      // the app is in the foreground on Android, so we just log here.
      // The in-app notification bell will pick up the notification via the
      // existing backend polling, so no duplicate is created.
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[FCM] Foreground push received:', notification.title);
        // To show a native heads-up while in foreground you would need a
        // native Android service — the web layer cannot do this.
        // The user will see the in-app notification badge update instead.
      });

      // User tapped a notification in the system shade — navigate to the URL
      // embedded in the notification data payload.
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[FCM] Notification tapped:', notification.notification.title);
        const data = notification.notification.data;
        if (data && data.url) {
          navigate(data.url);
        }
      });

      // ── Step 2: Check / request notification permission ─────────────────────
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[FCM] Permission status:', permStatus.receive);

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
        console.log('[FCM] Permission after request:', permStatus.receive);
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[FCM] Push notification permission not granted.');
        return;
      }

      // ── Step 3: Register with FCM — fires 'registration' with the token ─────
      try {
        await PushNotifications.register();
        console.log('[FCM] register() called — awaiting token via listener.');
      } catch (e) {
        console.error('[FCM] Failed to call register():', e);
      }
    };

    init();

    return () => {
      mounted = false;
      // Remove all listeners when the component unmounts to avoid duplicates
      // if the component is ever remounted (e.g. during hot reload in dev).
      PushNotifications.removeAllListeners();
    };
  }, [navigate]);

  return null;
}

