export const useAuth = () => {
  const token = useCookie('auth-token', {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    sameSite: 'lax'
  })

  const isAuthenticated = computed(() => {
    // Token varsa ve geçerli bir değerse true döner
    return !!token.value && token.value.length > 0
  })

  const login = (authToken: string) => {
    token.value = authToken
  }

  const logout = () => {
    // Cookie'yi tamamen temizle
    token.value = null
    
    // Tarayıcı storage'ı da temizle
    if (process.client) {
      localStorage.clear()
      sessionStorage.clear()
    }
    
    const localePath = useLocalePath()
    navigateTo(localePath('/login'), { replace: true })
  }

  return {
    token,
    isAuthenticated,
    login,
    logout
  }
}
