/**
 * Modiv's Education - Firebase Cloud Messaging Service Worker
 * Handles background Web Push Notifications for leads, messages, demo classes & updates.
 */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY",
  authDomain: "modivs-education.firebaseapp.com",
  projectId: "modivs-education",
  storageBucket: "modivs-education.firebasestorage.app",
  messagingSenderId: "821328108086",
  appId: "1:821328108086:web:852c06bc88fb39d0961697"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Background Push Notification handler
messaging.onBackgroundMessage(function(payload) {
  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || "Modiv’s Education Alert";
  const body = notif.body || data.body || data.description || "You have a new update on Modiv’s Education.";
  const clickAction = data.click_action || data.actionUrl || data.url || "/";

  const notificationOptions = {
    body: body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || data.conversationId || "modivs-alert",
    renotify: true,
    data: {
      url: clickAction,
      ...data
    }
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Handle push notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a tab is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          if (client.navigate && targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
