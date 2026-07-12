// firebase-messaging-sw.js

// 1. Firebase Service Worker Scripts import kar rahe hain (Version 10.8.1 compat)
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 2. Apni Firebase Config yahan daaliye (Ye aapko apni firebase-config.js mein mil jayegi)
const firebaseConfig = {
    apiKey: "AIzaSyDgJowFUpgzqf9nEyW6vPowdqGSw1WcBSM",
    projectId: "lin-academy",
    messagingSenderId: "138973997932",
    appId: "1:138973997932:web:3e2a41b1774c8a9e69a149"
};

// 3. App Initialize karo
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. Background Message Listener (Jab app band ho)
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Background message received: ', payload);
    
    const notificationTitle = payload.notification.title || "Lin Academy Alert";
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192x192.png', // Aapka PWA Logo
        badge: '/icon-192x192.png'
    };

    // Phone/Desktop ki screen par native notification dikhao
    self.registration.showNotification(notificationTitle, notificationOptions);
});