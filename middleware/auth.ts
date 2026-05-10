export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  
  try {
    await authStore.initialize()
  } catch (error) {
    // Silently fail initialization - will redirect to login
    console.debug('Auth initialization error:', error)
  }

  if (!authStore.isAuthenticated && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (authStore.isAuthenticated && to.path === '/login') {
    return navigateTo('/')
  }
})