import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from './api';

export const registerPushNotificationListeners = async () => {
  if (!Capacitor.isNativePlatform()) return;

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    try {
      await api.post('/notifications/fcm-token', { token: token.value });
      console.log('FCM token sent to server successfully');
    } catch (err) {
      console.error('Failed to send FCM token to server:', err);
    }
  });

  // Some issue with our setup and push will not work
  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ', notification);
  });

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ', notification);
  });
};

export const setupCapacitorPushNotifications = async () => {
  // Only run this on actual native platforms (Android/iOS)
  // This ensures your existing web/Vapid push logic remains unaffected
  if (!Capacitor.isNativePlatform()) {
    console.log('Skipping Capacitor push notifications on web.');
    return;
  }

  try {
    // Request permission to use push notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push permission');
      return;
    }

    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();
  } catch (error) {
    console.error('Error setting up push notifications', error);
  }
};
