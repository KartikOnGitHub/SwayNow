// Firebase Cloud Messaging Service Worker
// Place this file at: public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 🔧 Replace with your actual Firebase config
firebase.initializeApp({
    apiKey: "AIzaSyCMAYW5dUWOIBZIYIgQ_eDzEFGc6TInQWY",
    authDomain: "sway-29d10.firebaseapp.com",
    projectId: "sway-29d10",
    storageBucket: "sway-29d10.firebasestorage.app",
    messagingSenderId: "509600865269",
    appId: "1:509600865269:web:ede6dceefe15cf870b1ebc",
    measurementId: "G-DNLRKVR5KH"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification ?? {};
    self.registration.showNotification(title ?? "SwayNow", {
        body: body ?? "You have a new notification",
        icon: icon ?? "/icon-192.png",
        badge: "/icon-192.png",
        tag: payload.data?.type ?? "general",
        data: payload.data,
        vibrate: [200, 100, 200],
        actions: payload.data?.type === "join_request"
            ? [{ action: "view", title: "View request" }]
            : [],
    });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const data = event.notification.data ?? {};
    let url = "/";

    if (data.type === "join_request") url = "/requests";
    else if (data.type === "request_accepted") url = `/chat/${data.chatId}`;
    else if (data.type === "new_message") url = `/chat/${data.chatId}`;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});