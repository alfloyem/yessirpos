export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()
  const localePath = useLocalePath()

  // Define routes that don't require authentication (e.g., login)
  const isLoginPage = to.path.includes('/login')

  if (!isAuthenticated.value && !isLoginPage) {
    return navigateTo(localePath('/login'))
  }

  if (isAuthenticated.value && isLoginPage) {
    return navigateTo(localePath('/'))
  }
})
