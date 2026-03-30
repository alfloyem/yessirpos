import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  
  // Return only non-sensitive data required for client-side setup
  return {
    firebase: {
      apiKey: config.public.firebase.apiKey,
      authDomain: config.public.firebase.authDomain,
      projectId: config.public.firebase.projectId,
      storageBucket: config.public.firebase.storageBucket,
      messagingSenderId: config.public.firebase.messagingSenderId,
      appId: config.public.firebase.appId,
      vapidKey: config.public.firebase.vapidKey,
    },
    client: {
      id: config.public.clientId,
    }
  }
})
