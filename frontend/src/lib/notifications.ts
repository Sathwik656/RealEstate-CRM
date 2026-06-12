import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

export const checkPermissions = async () => {
  if (!isNative) return { display: 'granted' };
  const status = await LocalNotifications.checkPermissions();
  return status;
};

export const requestPermissions = async () => {
  if (!isNative) return { display: 'granted' };
  const status = await LocalNotifications.requestPermissions();
  return status;
};

export const scheduleReminder = async (
  id: number,
  title: string,
  body: string,
  date: Date
) => {
  if (!isNative) {
    console.log('Skipping native notification schedule on web platform:', { id, title, body, date });
    return;
  }
  
  try {
    const permissions = await checkPermissions();
    if (permissions.display !== 'granted') {
      const newPermissions = await requestPermissions();
      if (newPermissions.display !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id,
          schedule: { at: date },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: null,
        },
      ],
    });
    console.log(`Successfully scheduled notification ${id} for ${date.toLocaleString()}`);
  } catch (error) {
    console.error('Failed to schedule local notification:', error);
  }
};

export const cancelReminder = async (id: number) => {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id }],
    });
    console.log(`Successfully cancelled notification ${id}`);
  } catch (error) {
    console.error(`Failed to cancel local notification ${id}:`, error);
  }
};

// You can also add listeners here or in the top-level app component
export const setupNotificationListeners = (onNotificationClick: (id: number) => void) => {
  if (!isNative) return;
  
  LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
    console.log('Notification action performed', notificationAction);
    const id = notificationAction.notification.id;
    if (id) {
      onNotificationClick(id);
    }
  });
};
