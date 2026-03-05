export default defineNuxtRouteMiddleware((to) => {
  const { token, isAuthenticated } = useAuth()
  const localePath = useLocalePath()
  
  // Public routes
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.some(route => to.path.includes(route))
  
  // Login sayfasına gitmek istiyorsa ve zaten login olmuşsa ana sayfaya yönlendir
  if (isAuthenticated.value && isPublicRoute) {
    return navigateTo(localePath('/'))
  }

  // Login sayfası dışındaki sayfalara gitmek istiyorsa ve login değilse login sayfasına yönlendir
  if (!isAuthenticated.value && !isPublicRoute) {
    return navigateTo(localePath('/login'))
  }
})
