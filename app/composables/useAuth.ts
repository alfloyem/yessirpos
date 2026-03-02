export const useAuth = () => {
  const token = useCookie('auth-token', {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  })

  const isAuthenticated = computed(() => !!token.value)

  const login = (mockToken: string) => {
    token.value = mockToken
  }

  const logout = () => {
    token.value = null
    const localePath = useLocalePath()
    navigateTo(localePath('/login'))
  }

  return {
    token,
    isAuthenticated,
    login,
    logout
  }
}
