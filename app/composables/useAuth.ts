import { computed } from 'vue'
import { useCookie, navigateTo } from '#imports'
import { useLocalePath } from '#i18n'

export const useAuth = () => {
  const token = useCookie('auth-token', {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    sameSite: 'lax'
  })

  const user = useState<any>('auth-user', () => null)

  const isAuthenticated = computed(() => {
    // Token varsa ve geçerli bir değerse true döner
    return !!token.value && token.value.length > 0
  })

  const login = (authToken: string, userData?: any) => {
    token.value = authToken
    if (userData) {
      user.value = userData
    }
  }

  const logout = () => {
    // Cookie'yi tamamen temizle
    token.value = null
    user.value = null

    // Tarayıcı storage'ı da temizle
    if (process.client) {
      localStorage.clear()
      sessionStorage.clear()
    }

    const localePath = useLocalePath()
    navigateTo(localePath('/login'), { replace: true })
  }

  // Kullanıcının hala geçerli olup olmadığını kontrol et
  const verifyUser = async () => {
    if (!token.value) return false

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<any>((config.public.apiBaseUrl || '') + '/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
      if (response?.user) {
        user.value = response.user
      }
      return true
    } catch (error) {
      // Token geçersiz veya kullanıcı silinmiş
      logout()
      return false
    }
  }

  // Client-side'da periyodik kontrol
  if (process.client && token.value) {
    // Sayfa yüklendiğinde kontrol et
    verifyUser()

    // Her 5 dakikada bir kontrol et
    setInterval(() => {
      if (token.value) {
        verifyUser()
      }
    }, 5 * 60 * 1000) // 5 dakika
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    verifyUser
  }
}
