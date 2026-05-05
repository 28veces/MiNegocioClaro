<script setup lang="ts">
const toastStore = useToastStore()

const variantClasses: Record<string, string> = {
  success: 'border-leaf-400/40 bg-leaf-500/10 text-leaf-100',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  warning: 'border-maize-400/40 bg-maize-400/10 text-maize-100',
  info: 'border-sky-400/40 bg-sky-500/10 text-sky-100'
}

const badgeClasses: Record<string, string> = {
  success: 'bg-leaf-400/20 text-leaf-100',
  error: 'bg-rose-500/20 text-rose-100',
  warning: 'bg-maize-400/20 text-maize-100',
  info: 'bg-sky-500/20 text-sky-100'
}

const labels: Record<string, string> = {
  success: 'OK',
  error: 'Error',
  warning: 'Aviso',
  info: 'Info'
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-30 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-3">
      <article
        v-for="toast in toastStore.items"
        :key="toast.id"
        class="pointer-events-auto surface-glow rounded-3xl border px-4 py-4 shadow-floating backdrop-blur-sm"
        :class="variantClasses[toast.variant]"
      >
        <div class="flex items-start gap-3">
          <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" :class="badgeClasses[toast.variant]">
            {{ labels[toast.variant] }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p class="mt-1 text-sm leading-6 opacity-90">{{ toast.message }}</p>
          </div>
          <button
            class="rounded-full border border-white/10 px-2 py-1 text-xs font-medium text-current/80 transition hover:border-white/30 hover:text-current"
            type="button"
            @click="toastStore.dismiss(toast.id)"
          >
            Cerrar
          </button>
        </div>
      </article>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>