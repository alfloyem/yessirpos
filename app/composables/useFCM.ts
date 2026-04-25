import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging, type MessagePayload } from 'firebase/messaging'
import { ref } from 'vue'
import { useServerConfig } from '~/composables/useServerConfig'

export const useFCM = () => {
  const isSupported = import.meta.client && 'Notification' in window && 'serviceWorker' in navigator
  
  const token = ref<string | null>(null)
  const permissionStatus = ref<NotificationPermission | null>(null)
  const isInitialized = ref(false)
  let messaging: Messaging | null = null
  let firebaseApp: FirebaseApp | null = null
  let vapidKey = ''

  const checkPermission = () => {
    if (import.meta.client && 'Notification' in window) {
      permissionStatus.value = Notification.permission
    }
  }

  const initFirebase = async () => {
    if (!isSupported || isInitialized.value) return
    
    try {
      const { activeUrl } = useServerConfig()
      const config = await $fetch<any>(activeUrl.value + '/api/config/public')
      
      if (!config.firebase?.apiKey) return

      firebaseApp = initializeApp(config.firebase)
      messaging = getMessaging(firebaseApp)
      vapidKey = config.firebase.vapidKey
      isInitialized.value = true
      
      console.log('Firebase Dynamic Config Loaded Successfully')
    } catch (error) {
      console.error('Failed to load Firebase dynamic config:', error)
    }
  }

  const requestPermission = async () => {
    if (!isSupported) return null
    
    if (!isInitialized.value) await initFirebase()
    if (!messaging) return null

    try {
      const permission = await Notification.requestPermission()
      permissionStatus.value = permission

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready
        
        const fcmToken = await getToken(messaging, { 
          vapidKey,
          serviceWorkerRegistration: registration 
        })
        
        token.value = fcmToken
        console.log('FCM Token grabbed:', fcmToken)
        
        const { $api } = useNuxtApp()
        await $api('/api/auth/fcm-token', {
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

    onMessage(messaging, async (payload: MessagePayload) => {
      console.log('Foreground notification received:', payload)
      
      const title = payload.notification?.title || 'Yeni Bildiriş'
      const options: NotificationOptions = {
        body: payload.notification?.body,
        icon: '/icons/android-chrome-192x192.png',
        badge: '/icons/android-chrome-96x96.png',
        data: {
          ...payload.data,
          click_action: payload.data?.click_action || '/notifications'
        },
        tag: payload.data?.type || 'fcm-notification',
        // @ts-ignore - renotify is supported by modern browsers but missing in some TS definitions
        renotify: true
      }

      if (document.visibilityState === 'visible') {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready
          registration.showNotification(title, options)
        }
      }
    })
  }

  if (import.meta.client) {
    checkPermission()
    if (permissionStatus.value === 'granted') {
      initFirebase().then(() => requestPermission())
    }
  }

  return {
    token,
    permissionStatus,
    requestPermission,
    isSupported,
    initFirebase
  }
}
