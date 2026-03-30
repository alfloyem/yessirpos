import { useRuntimeConfig, useState } from '#imports'

const API_URL_KEY = 'yessir_api_server_url'
const CLIENT_ID_KEY = 'yessir_terminal_client_id'

export const useServerConfig = () => {
  const runtimeConfig = useRuntimeConfig().public
  
  // Reactive state for the currently active config
  const activeUrl = useState('active_api_url', () => '')
  const activeClientId = useState('active_client_id', () => '')

  const initConfig = () => {
    if (!process.client) return
    
    const storedUrl = localStorage.getItem(API_URL_KEY)
    const storedClientId = localStorage.getItem(CLIENT_ID_KEY)

    // Falls back to .env if localStorage is empty
    activeUrl.value = storedUrl || runtimeConfig.apiBaseUrl || ''
    activeClientId.value = storedClientId || runtimeConfig.clientId || 'bakustreet'
  }

  const setConfig = (url: string, clientId: string) => {
    const formattedUrl = url.replace(/\/$/, '') // Remove trailing slash
    localStorage.setItem(API_URL_KEY, formattedUrl)
    localStorage.setItem(CLIENT_ID_KEY, clientId)
    
    activeUrl.value = formattedUrl
    activeClientId.value = clientId
    
    // Refresh the page to apply everything cleanly
    if (process.client) window.location.reload()
  }

  const resetConfig = () => {
    localStorage.removeItem(API_URL_KEY)
    localStorage.removeItem(CLIENT_ID_KEY)
    initConfig()
    if (process.client) window.location.reload()
  }

  return {
    activeUrl,
    activeClientId,
    initConfig,
    setConfig,
    resetConfig,
    isCustomConfig: () => !!(process.client && localStorage.getItem(API_URL_KEY))
  }
}
