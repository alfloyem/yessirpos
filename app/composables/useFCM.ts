import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'
import { useRuntimeConfig } from '#imports'
import { ref } from 'vue'

export const useFCM = () => {
  const config = useRuntimeConfig().public.firebase
  if (!config.apiKey) return { token: ref(null), permissionStatus: ref(null), requestPermission: async () => null, isSupported: false }

  const firebaseConfig = {
    apiKey: config.apiKey as string,
    authDomain: config.authDomain as string,
    projectId: config.projectId as string,
    storageBucket: config.storageBucket as string,
    messagingSenderId: config.messagingSenderId as string,
    appId: config.appId as string,
  }

  const vapidKey = config.vapidKey as string

  // Initialize state
  let messaging: Messaging | null = null;
  const isSupported = process.client && 'Notification' in window && 'serviceWorker' in navigator

  if (isSupported) {
    try {
      const app = initializeApp(firebaseConfig)
      messaging = getMessaging(app)
    } catch (error) {
      console.error('Firebase initialization error', error)
    }
  }

  const token = ref<string | null>(null)
  const permissionStatus = ref<NotificationPermission | null>(null)

  const checkPermission = () => {
    if (process.client && 'Notification' in window) {
      permissionStatus.value = Notification.permission
    }
  }

  const requestPermission = async () => {
    if (!isSupported || !messaging) return null

    try {
      const permission = await Notification.requestPermission()
      permissionStatus.value = permission

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        
        const fcmToken = await getToken(messaging, { 
          vapidKey,
          serviceWorkerRegistration: registration 
        })
        
        token.value = fcmToken
        console.log('FCM Token grabbed:', fcmToken)
        
        // Sync to backend automatically
        await $fetch('/api/auth/fcm-token', {
          method: 'POST',
          body: { token: fcmToken }
        }).catch(e => console.error('Failed to sync token', e))
        
        setupOnMessage()
        
        return fcmToken
      }
    } catch (error) {
      console.error('Error getting FCM token', error)
      return null
    }
  }

  const setupOnMessage = () => {
    if (!isSupported || !messaging) return

    onMessage(messaging, (payload) => {
      console.log('Foreground notification received:', payload)
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Yeni Bildiriş', {
           body: payload.notification?.body,
           icon: '/icon.png'
        })
      }
    })
  }

  if (process.client) {
    checkPermission()
    if (permissionStatus.value === 'granted') {
      requestPermission() // Silently refresh token
    }
  }

  return {
    token,
    permissionStatus,
    requestPermission,
    isSupported
  }
}
