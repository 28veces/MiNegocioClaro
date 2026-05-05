<script setup lang="ts">
import { formatCurrency, formatPercent } from '~/composables/useBusinessSummary'
import type { Business, BusinessSummary } from '~/types/domain'

defineProps<{
  business: Business
  summary: BusinessSummary
  canManage: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="`/businesses/${business.id}`"
    class="surface-card surface-glow block rounded-[1.75rem] px-5 py-5 transition hover:-translate-y-0.5 hover:border-white/20"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-maize-300">{{ business.kind }}</p>
        <h3 class="mt-2 text-xl font-semibold text-stone-50">{{ business.name }}</h3>
        <p class="mt-2 text-sm text-stone-300">{{ business.location }}</p>
      </div>
      <span
        class="rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]"
        :class="canManage ? 'bg-leaf-500/15 text-leaf-200' : 'bg-white/10 text-stone-300'"
      >
        {{ canManage ? 'Gestionable' : 'Solo lectura' }}
      </span>
    </div>

    <p class="mt-4 text-sm leading-6 text-stone-300">
      {{ business.description }}
    </p>

    <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
      <div class="rounded-2xl bg-white/5 px-3 py-3">
        <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Invertido</p>
        <p class="mt-2 font-semibold text-stone-100">{{ formatCurrency(summary.totalInvested, business.currency) }}</p>
      </div>
      <div class="rounded-2xl bg-white/5 px-3 py-3">
        <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Ventas</p>
        <p class="mt-2 font-semibold text-stone-100">{{ formatCurrency(summary.totalSales, business.currency) }}</p>
      </div>
      <div class="rounded-2xl bg-white/5 px-3 py-3">
        <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Utilidad neta</p>
        <p class="mt-2 font-semibold" :class="summary.netProfit >= 0 ? 'text-leaf-300' : 'text-rose-300'">
          {{ formatCurrency(summary.netProfit, business.currency) }}
        </p>
      </div>
      <div class="rounded-2xl bg-white/5 px-3 py-3">
        <p class="text-xs uppercase tracking-[0.2em] text-stone-400">ROI</p>
        <p class="mt-2 font-semibold" :class="summary.roi !== null && summary.roi >= 0 ? 'text-leaf-300' : 'text-maize-200'">
          {{ formatPercent(summary.roi) }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>