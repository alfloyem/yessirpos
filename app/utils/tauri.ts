import { openUrl as tauriOpenUrl } from '@tauri-apps/plugin-opener'

/**
 * URL-i kənar brauzerdə açır.
 * Tauri-də istifadə edildikdə tauri-plugin-opener-dən istifadə edir.
 * Browser-də window.open-dən istifadə edir.
 */
export const openExternalUrl = async (url: string) => {
  if (!url) return
  
  try {
    // Check if we are running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      await tauriOpenUrl(url)
    } else {
      window.open(url, '_blank')
    }
  } catch (err) {
    console.error('Failed to open external URL:', err)
    // Fallback
    if (typeof window !== 'undefined') {
      window.open(url, '_blank')
    }
  }
}
