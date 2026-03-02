export default defineNuxtRouteMiddleware((to) => {
  const { token } = useAuth()
  const localePath = useLocalePath()
  
  // Login sayfasına gitmek istiyorsa ve zaten login olmuşsa ana sayfaya yönlendir
  if (token.value && to.path.includes('/login')) {
    return navigateTo(localePath('/'))
  }

  // Login sayfası dışındaki sayfalara gitmek istiyorsa ve login değilse login sayfasına yönlendir
  if (!token.value && !to.path.includes('/login')) {
    return navigateTo(localePath('/login'))
  }
})
