export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  await authStore.initialize()

  if (!authStore.isAuthenticated && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (authStore.isAuthenticated && to.path === '/login') {
    return navigateTo('/')
  }
})