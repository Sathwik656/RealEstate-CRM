/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST || []);

// Handle push events
self.addEventListener('push', (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options: any = {
      body: data.body,
      icon: data.icon || '/logo.png',
      badge: data.badge || '/favicon.svg',
      data: data.data,
      vibrate: [200, 100, 200],
      requireInteraction: true, // Keep it visible until clicked
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'New Notification', options)
    );
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients: any[]) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If the URL matches, focus it and navigate
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If we have any CRM window open, navigate it to the target URL
      if (windowClients.length > 0 && 'focus' in windowClients[0]) {
        windowClients[0].focus();
        windowClients[0].navigate(urlToOpen);
        return;
      }

      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Take over control immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(self.clients.claim());
});
