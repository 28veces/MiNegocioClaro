<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const toastStore = useToastStore()

await authStore.initialize()

const navigationItems = computed(() => {
  if (!authStore.isAuthenticated) {
    return [{ label: 'Acceso', to: '/login' }]
  }

  const items = [
    { label: 'Resumen', to: '/' },
    { label: 'Negocios', to: '/businesses' }
  ]

  if (authStore.canManagePeople) {
    items.push({ label: 'Personas', to: '/persons' })
    items.push({ label: 'Sociedades', to: '/societies' })
  }

  return items
})

const logout = async () => {
  await authStore.logout()
  await navigateTo('/login')
}

watch(
  () => route.fullPath,
  () => {
    toastStore.flushPending()
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-soil-950 text-stone-100">
    <ToastStack v-if="toastStore.items.length" />

    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -left-16 top-0 h-44 w-44 rounded-full bg-maize-500/20 blur-3xl" />
      <div class="absolute right-0 top-24 h-52 w-52 rounded-full bg-leaf-500/20 blur-3xl" />
    </div>

    <div class="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <header class="surface-card surface-glow mb-6 flex items-start justify-between gap-6 px-5 py-4">
        <!-- Lado izquierdo: Logo y título -->
        <div class="flex items-start gap-4">
          <!-- Logo -->
          <div class="mt-1 flex-shrink-0">
            <svg class="h-12 w-12 text-maize-400" fill="currentColor" viewBox="0 0 24 24">
              <!-- Icono de campo/terreno -->
              <path d="M3 7h18v2H3V7zm0 4h18v8H3v-8zm2 2v4h14v-4H5zm11 6h-2v2h2v-2zm-4 0h-2v2h2v-2z"/>
              <rect x="7" y="4" width="2" height="2" fill="currentColor" opacity="0.6"/>
              <rect x="15" y="4" width="2" height="2" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>

          <div>
            <p class="text-xs uppercase tracking-[0.35em] text-maize-300/90">MiNegocioClaro</p>
            <h1 class="mt-2 text-2xl font-semibold text-stone-50">Control de negocios</h1>
            <p class="mt-1 max-w-2xl text-sm text-stone-300">
              Maneja los negocios que tengas y manten control de tus ingresos y egresos y los de tus socios.
            </p>
          </div>
        </div>

        <!-- Lado derecho: Información de usuario -->
        <div v-if="authStore.user" class="flex flex-col items-center gap-3 text-center">
          <!-- Icono de usuario -->
          <svg class="h-8 w-8 text-leaf-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>

          <!-- Nombre y rol -->
          <div class="space-y-1">
            <p class="text-sm font-medium text-stone-100">{{ authStore.user.name }}</p>
            <p class="text-xs uppercase tracking-[0.2em] text-stone-400">{{ authStore.user.role }}</p>
          </div>

          <!-- Modo de datos -->
          <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs uppercase tracking-[0.25em] text-leaf-300">
            {{ runtimeConfig.public.dataMode }} mode
          </span>

          <!-- Botón logout -->
          <button
            class="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200 transition hover:border-maize-400 hover:text-maize-300 hover:bg-maize-400/10"
            type="button"
            @click="logout"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main class="flex-1">
        <slot />
      </main>

      <nav
        class="surface-card surface-glow fixed bottom-4 left-1/2 z-10 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-2 px-3 py-2 lg:max-w-lg"
      >
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="flex-1 rounded-2xl px-4 py-3 text-center text-sm font-medium transition"
          :class="route.path === item.to ? 'bg-maize-400 text-soil-950 shadow-floating' : 'text-stone-300 hover:bg-white/5 hover:text-stone-50'"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
