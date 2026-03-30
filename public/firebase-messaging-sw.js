import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Initialization values will be injected during build or hardcoded if allowed.
// For a standard Nuxt setup, since this is a static file in public/, 
// we should ideally use the same config as the app.
// Note: Service Workers cannot easily access Nuxt runtimeConfig at runtime without additional hacks.
// So we'll use the values you provided in your firebase.json file.

const firebaseConfig = {
  apiKey: "AIzaSyDStysEJmuogwBBhqEDDp5kJQdxR6WKI60",
  authDomain: "yessirpos.firebaseapp.com",
  projectId: "yessirpos",
  storageBucket: "yessirpos.firebasestorage.app",
  messagingSenderId: "1077686504612",
  appId: "1:1077686504612:web:49985eb7ad488af318aa31",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
