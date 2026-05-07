<script setup lang="ts">
const authStore = useAuthStore()
const businessesStore = useBusinessesStore()

await authStore.initialize()

if (authStore.isAuthenticated) {
  await navigateTo('/')
}

const runtimeConfig = useRuntimeConfig()

const form = reactive({
  email: 'admin@teamveces.local',
  password: 'demo123'
})

const demoAccounts = [
  { label: 'Admin', email: 'admin@teamveces.local' },
  { label: 'Consulta', email: 'viewer@teamveces.local' },
  { label: 'Socio', email: 'partner@teamveces.local' }
]

const submit = async () => {
  try {
    await authStore.login(form)
    businessesStore.resetState()
    await navigateTo('/')
  } catch {
    return
  }
}

const useDemoAccount = (email: string) => {
  form.email = email
  form.password = 'demo123'
}
</script>

<template>
  <section class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
    <article class="surface-card surface-glow rounded-[2rem] px-6 py-7 sm:px-8">
      <p class="text-xs uppercase tracking-[0.35em] text-maize-300">Inicio</p>
      <h2 class="mt-4 max-w-xl text-4xl font-semibold leading-tight text-stone-50">
        Rentabilidad agrícola con foco en socios, inversiones y control operativo.
      </h2>
      <p class="mt-5 max-w-2xl text-base leading-7 text-stone-300">
        Esta primera implementación trabaja con datos locales y roles reales del MVP. Puedes entrar como administrador,
        usuario de consulta o socio para validar permisos y flujos.
      </p>

      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
          <p class="text-xs uppercase tracking-[0.25em] text-stone-400">Negocios</p>
          <p class="mt-3 text-2xl font-semibold text-stone-50">2</p>
        </div>
        <div class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
          <p class="text-xs uppercase tracking-[0.25em] text-stone-400">Movimientos</p>
          <p class="mt-3 text-2xl font-semibold text-stone-50">12</p>
        </div>
        <div class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
          <p class="text-xs uppercase tracking-[0.25em] text-stone-400">Modo</p>
          <p class="mt-3 text-2xl font-semibold text-leaf-300">Firebase</p>
        </div>
      </div>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <h3 class="text-xl font-semibold text-stone-50">Entrar al MVP</h3>
      <p class="mt-2 text-sm text-stone-300">La contraseña demo para las tres cuentas es <strong class="text-stone-100">demo123</strong>.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-stone-200">Correo</span>
          <input
            v-model="form.email"
            class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition focus:border-maize-400"
            type="email"
            placeholder="tu@correo.com"
          >
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-stone-200">Contraseña</span>
          <input
            v-model="form.password"
            class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition focus:border-maize-400"
            type="password"
            placeholder="demo123"
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
          {{ authStore.pending ? 'Ingresando...' : 'Entrar al panel' }}
        </button>
      </form>

      <div class="mt-6 space-y-3">
        <p class="text-xs uppercase tracking-[0.25em] text-stone-400">Cuentas demo</p>
        <button
          v-for="account in demoAccounts"
          :key="account.email"
          class="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-leaf-400/40 hover:bg-white/10"
          type="button"
          @click="useDemoAccount(account.email)"
        >
          <span class="text-sm font-medium text-stone-100">{{ account.label }}</span>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">{{ account.email }}</span>
        </button>
      </div>
    </article>
  </section>
</template>