<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    value: string
    hint?: string
    accent?: 'leaf' | 'maize' | 'stone'
  }>(),
  {
    hint: '',
    accent: 'stone'
  }
)

const accentClasses = computed(() => {
  if (props.accent === 'leaf') {
    return 'from-leaf-400/25 to-leaf-500/5 text-leaf-200'
  }

  if (props.accent === 'maize') {
    return 'from-maize-400/25 to-maize-500/5 text-maize-200'
  }

  return 'from-white/12 to-white/5 text-stone-200'
})
</script>

<template>
  <article class="surface-card overflow-hidden rounded-[1.75rem]">
    <div class="bg-gradient-to-br px-4 py-5" :class="accentClasses">
      <p class="text-xs uppercase tracking-[0.3em] text-current/70">{{ label }}</p>
      <p class="mt-4 text-2xl font-semibold text-stone-50">{{ value }}</p>
      <p v-if="hint" class="mt-2 text-sm text-current/80">{{ hint }}</p>
    </div>
  </article>
</template>