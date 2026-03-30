import { ref } from 'vue'

export const useUpdater = () => {
  const isChecking = ref(false)
  const isDownloading = ref(false)
  const updateAvailable = ref(false)
  const updateVersion = ref<string | null>(null)
  const updateBody = ref<string | null>(null)
  const error = ref<string | null>(null)

  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__

  const checkForUpdates = async () => {
    if (!isTauri) return
    isChecking.value = true
    error.value = null

    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()

      if (update?.available) {
        updateAvailable.value = true
        updateVersion.value = update.version
        updateBody.value = update.body ?? null
      } else {
        updateAvailable.value = false
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Update check failed'
      console.error('Error checking updates:', e)
    } finally {
      isChecking.value = false
    }
  }

  const installUpdate = async () => {
    if (!isTauri) return
    isDownloading.value = true
    error.value = null

    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const { relaunch } = await import('@tauri-apps/plugin-process')
      const update = await check()

      if (update?.available) {
        await update.downloadAndInstall()
        await relaunch()
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Update install failed'
      console.error('Error installing update:', e)
    } finally {
      isDownloading.value = false
    }
  }

  return {
    isChecking,
    isDownloading,
    updateAvailable,
    updateVersion,
    updateBody,
    error,
    checkForUpdates,
    installUpdate,
  }
}
