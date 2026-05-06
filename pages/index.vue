<script setup lang="ts">
import { buildBusinessSummary, buildPortfolioSummary, formatCurrency, formatPercent } from '~/composables/useBusinessSummary'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const businessesStore = useBusinessesStore()

await authStore.initialize()
await businessesStore.hydrateOverview(true)

const portfolio = computed(() => buildPortfolioSummary(businessesStore.entriesByBusiness))

const businessCards = computed(() => {
  return businessesStore.businesses.map((business) => ({
    business,
    summary: buildBusinessSummary(business.id, businessesStore.entriesByBusiness[business.id] ?? [])
  }))
})
</script>

<template>
  <section class="space-y-6">
    <article class="surface-card surface-glow rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-leaf-300">Panorama</p>
          <h2 class="mt-3 text-3xl font-semibold text-stone-50">{{ authStore.roleLabel }}: {{ authStore.user?.name }}</h2>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
            Resumen consolidado de los proyectos, inversión comprometida y utilidad neta estimada.
          </p>
        </div>

        <NuxtLink
          to="/businesses"
          class="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-maize-400 hover:text-maize-200"
        >
          Ir al módulo de negocios
        </NuxtLink>
      </div>
    </article>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        accent="maize"
        label="Capital comprometido"
        :value="formatCurrency(portfolio.totalInvested)"
        hint="Suma de inversión y compras de activos"
      />
      <KpiCard
        accent="stone"
        label="Gasto operativo"
        :value="formatCurrency(portfolio.totalExpenses)"
        hint="Salidas operativas registradas"
      />
      <KpiCard
        accent="leaf"
        label="Ventas"
        :value="formatCurrency(portfolio.totalSales)"
        :hint="`${portfolio.profitableBusinesses} de ${portfolio.businessCount} negocios en positivo`"
      />
      <KpiCard
        accent="leaf"
        label="Resultado neto"
        :value="formatCurrency(portfolio.netProfit)"
        :hint="portfolio.totalInvested > 0 ? formatPercent((portfolio.netProfit / portfolio.totalInvested) * 100) : 'Sin base de ROI'"
      />
    </div>

    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Negocios visibles</p>
          <h3 class="mt-2 text-2xl font-semibold text-stone-50">Seguimiento por unidad</h3>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <BusinessCard
          v-for="item in businessCards"
          :key="item.business.id"
          :business="item.business"
          :summary="item.summary"
          :can-manage="authStore.canManageBusiness(item.business.id)"
        />
      </div>
    </section>
  </section>
</template>