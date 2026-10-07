import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '../lib/api';

export function FCMHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkAndRequestPermission = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        try {
          await PushNotifications.register();
        } catch (e) {
          console.error("Failed to register for push notifications:", e);
        }
      }
    };

    checkAndRequestPermission();

    const addListeners = async () => {
      await PushNotifications.addListener('registration', async (token) => {
        try {
          await api.post('/notifications/fcm-token', { token: token.value });
          console.log('FCM token registered successfully:', token.value);
        } catch (error) {
          console.error('Error registering FCM token:', error);
        }
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Registration error:', err.error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        // Local toast could be shown here
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification.actionId, notification.inputValue);

        const data = notification.notification.data;
        if (data && data.url) {
          navigate(data.url);
        }
      });
    };

    addListeners();

    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [navigate]);

  return null;
}
