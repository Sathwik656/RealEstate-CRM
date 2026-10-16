import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.verandarealty.app',
  appName: 'Veranda Realty',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      // Controls how notifications are presented when the app is in the foreground.
      // 'badge' updates the app icon badge count.
      // 'sound' plays the default notification sound.
      // 'alert' shows the notification banner/heads-up display.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
