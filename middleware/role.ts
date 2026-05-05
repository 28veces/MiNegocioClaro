export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  const toastStore = useToastStore()
  await authStore.initialize()

  const requiredAccess = to.meta.requiredAccess as 'manage' | 'admin' | undefined
  const businessId = typeof to.params.id === 'string' ? to.params.id : undefined

  if (!requiredAccess) {
    return
  }

  if (requiredAccess === 'admin' && !authStore.canManagePeople) {
    toastStore.warning(
      'Acceso restringido',
      'Solo el administrador puede gestionar el catálogo de personas.'
    )
    return navigateTo('/')
  }

  if (!businessId) {
    return
  }

  if (requiredAccess === 'manage' && !authStore.canManageBusiness(businessId)) {
    toastStore.warning(
      'Acceso restringido',
      'Tu rol puede consultar este negocio, pero no gestionarlo.'
    )
    return navigateTo(`/businesses/${businessId}`)
  }
})