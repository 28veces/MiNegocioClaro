<script setup lang="ts">
const authStore = useAuthStore()
const businessesStore = useBusinessesStore()

await authStore.initialize()

if (authStore.isAuthenticated) {
  await navigateTo('/')
}

const runtimeConfig = useRuntimeConfig()

const form = reactive({
  email: '',
  password: ''
})

const submit = async () => {
  try {
    await authStore.login(form)
    businessesStore.resetState()
    await navigateTo('/')
  } catch {
    return
  }
}
</script>

<template>
  <section class="grid min-h-screen items-center gap-6 py-12 lg:grid-cols-[1.2fr_0.8fr]">
    <article class="surface-card surface-glow rounded-[2rem] px-6 py-12 sm:px-8">
      <p class="text-xs uppercase tracking-[0.35em] text-maize-300">Bienvenido</p>
      <h1 class="mt-4 max-w-xl text-4xl font-semibold leading-tight text-stone-50">
        MiNegocioClaro
      </h1>
      <p class="mt-6 max-w-2xl text-base leading-7 text-stone-300">
        Gestión integral de negocios agrícolas. Monitorea inversiones, controla operaciones y optimiza rentabilidad con foco en socios y decisiones estratégicas.
      </p>

      <div class="mt-12 space-y-4">
        <div class="flex items-center gap-4">
          <div class="rounded-2xl bg-maize-400/10 p-3">
            <svg class="h-5 w-5 text-maize-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm text-stone-300">Análisis de rentabilidad en tiempo real</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="rounded-2xl bg-leaf-400/10 p-3">
            <svg class="h-5 w-5 text-leaf-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm text-stone-300">Gestión de socios y participaciones</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="rounded-2xl bg-stone-400/10 p-3">
            <svg class="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm text-stone-300">Auditoria completa de movimientos</span>
        </div>
      </div>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-8 sm:px-8">
      <h2 class="text-2xl font-semibold text-stone-50">Acceder</h2>

      <form class="mt-8 space-y-5" @submit.prevent="submit">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-stone-200">Correo electrónico</span>
          <input
            v-model="form.email"
            class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition focus:border-maize-400"
            type="email"
            placeholder="tu@correo.com"
            required
          >
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-stone-200">Contraseña</span>
          <input
            v-model="form.password"
            class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition focus:border-maize-400"
            type="password"
            placeholder="••••••••"
            required
          >
        </label>

        <p v-if="authStore.error" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {{ authStore.error }}
        </p>

        <button
          class="w-full rounded-2xl bg-maize-400 px-4 py-3 text-sm font-semibold text-soil-950 transition hover:bg-maize-300 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="authStore.pending"
          type="submit"
        >
          {{ authStore.pending ? 'Ingresando...' : 'Entrar' }}
        </button>
      </form>
    </article>
  </section>
</template>