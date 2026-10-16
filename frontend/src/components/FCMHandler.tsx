import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import api from '../lib/api';

/**
 * FCMHandler
 *
 * Must be rendered inside BrowserRouter because it uses useNavigate().
 *
 * Initialization order:
 * 1. Attach listeners.
 * 2. Check/request permission.
 * 3. Register with FCM.
 *
 * Renders nothing.
 */
export function FCMHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let mounted = true;
    let initializing = false;

    const listenerHandles: PluginListenerHandle[] = [];

    const addListener = async (
      listenerPromise: Promise<PluginListenerHandle>
    ) => {
      const handle = await listenerPromise;

      // If the component unmounted while the listener was being added,
      // immediately remove the listener instead of leaving it registered.
      if (!mounted) {
        await handle.remove();
        return false;
      }

      listenerHandles.push(handle);
      return true;
    };

    const init = async () => {
      if (initializing) return;
      initializing = true;

      try {
        // Step 1: Attach listeners before registering with FCM.

        const registrationListenerAdded = await addListener(
          PushNotifications.addListener(
            'registration',
            async (token) => {
              if (!mounted) return;

              console.log('[FCM] Registration successful.');

              try {
                await api.post('/notifications/fcm-token', {
                  token: token.value,
                });

                if (mounted) {
                  console.log(
                    '[FCM] Token saved to server.'
                  );
                }
              } catch (error) {
                console.error(
                  '[FCM] Failed to save token to server:',
                  error
                );
              }
            }
          )
        );

        if (!registrationListenerAdded) return;

        const registrationErrorListenerAdded = await addListener(
          PushNotifications.addListener(
            'registrationError',
            (error) => {
              console.error(
                '[FCM] Registration error:',
                error.error
              );
            }
          )
        );

        if (!registrationErrorListenerAdded) return;

        const foregroundListenerAdded = await addListener(
          PushNotifications.addListener(
            'pushNotificationReceived',
            (notification) => {
              console.log(
                '[FCM] Push received:',
                notification.title,
                notification.body
              );

              // This handler logs foreground messages only.
              // It does not display a system notification.
            }
          )
        );

        if (!foregroundListenerAdded) return;

        const actionListenerAdded = await addListener(
          PushNotifications.addListener(
            'pushNotificationActionPerformed',
            (event) => {
              if (!mounted) return;

              console.log(
                '[FCM] Notification tapped:',
                event.notification.title
              );

              const url = event.notification.data?.url;

              if (
                typeof url === 'string' &&
                url.startsWith('/') &&
                !url.startsWith('//')
              ) {
                navigate(url);
              }
            }
          )
        );

        if (!actionListenerAdded) return;

        if (!mounted) return;

        // Step 2: Check/request notification permission.

        let permission =
          await PushNotifications.checkPermissions();

        console.log(
          '[FCM] Notification permission:',
          permission.receive
        );

        if (
          permission.receive === 'prompt' ||
          permission.receive === 'prompt-with-rationale'
        ) {
          permission =
            await PushNotifications.requestPermissions();

          console.log(
            '[FCM] Permission after request:',
            permission.receive
          );
        }

        if (!mounted) return;

        if (permission.receive !== 'granted') {
          console.warn(
            '[FCM] Permission not granted; registration skipped.'
          );
          return;
        }

        // Step 3: Register with FCM.
        // The registration listener above receives the device token.

        await PushNotifications.register();

        console.log('[FCM] Registration requested.');
      } catch (error) {
        if (mounted) {
          console.error(
            '[FCM] Initialization failed:',
            error
          );
        }
      } finally {
        initializing = false;
      }
    };

    void init();

    return () => {
      mounted = false;

      // Remove only listeners owned by this component.
      void Promise.allSettled(
        listenerHandles.map((handle) => handle.remove())
      );
    };
  }, [navigate]);

  return null;
}

export default FCMHandler;