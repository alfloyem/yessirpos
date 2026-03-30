import { useServerConfig } from '~/composables/useServerConfig'

export default defineNuxtPlugin(() => {
  const { activeUrl, initConfig } = useServerConfig()
  const { token, logout } = useAuth()

  // Initialize once on startup
  if (process.client) initConfig()

  const apiFetch = $fetch.create({
    onRequest({ options }) {
      // Use dynamic URL on every request
      options.baseURL = activeUrl.value

      if (token.value) {
        options.headers = {
          ...(options.headers as any),
          Authorization: `Bearer ${token.value}`
        }
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        logout()
      }
    }
  })

  return {
    provide: {
      api: apiFetch
    }
  }
})
