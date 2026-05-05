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
      <header class="surface-card surface-glow mb-6 flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-maize-300/90">TeamVeces</p>
          <h1 class="mt-2 text-2xl font-semibold text-stone-50">Control de negocios agro</h1>
          <p class="mt-1 max-w-2xl text-sm text-stone-300">
            MVP mobile-first con trabajo local para desarrollo y una arquitectura lista para conectar Firebase.
          </p>
        </div>

        <div class="flex flex-col items-end gap-2 text-right">
          <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-leaf-300">
            {{ runtimeConfig.public.dataMode }} mode
          </span>
          <div v-if="authStore.user" class="space-y-1">
            <p class="text-sm font-medium text-stone-100">{{ authStore.user.name }}</p>
            <p class="text-xs uppercase tracking-[0.2em] text-stone-400">{{ authStore.user.role }}</p>
            <button
              class="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200 transition hover:border-maize-400 hover:text-maize-300"
              type="button"
              @click="logout"
            >
              Cerrar sesión
            </button>
          </div>
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