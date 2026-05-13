<script setup lang="ts">
import { buildBusinessPartnerContributionSummary, formatCurrency, formatEntryDate, formatPercent } from '~/composables/useBusinessSummary'
import { getPersonFullName } from '~/types/domain'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()
const businessesStore = useBusinessesStore()
const personsStore = usePersonsStore()
const toastStore = useToastStore()
const businessId = route.params.id as string

await authStore.initialize()

if (!authStore.canReadBusiness(businessId)) {
  await navigateTo('/')
}

await businessesStore.openBusiness(businessId)
await personsStore.hydrate(true)

const business = computed(() => businessesStore.activeBusiness)
const summary = computed(() => businessesStore.activeSummary)
const partners = computed(() => businessesStore.activePartners)
const partnerCards = computed(() => {
  return partners.value.map((partner) => ({
    ...partner,
    isArchived: Boolean(personsStore.personMap[partner.personId]?.archivedAt),
    displayName: personsStore.personMap[partner.personId]
      ? getPersonFullName(personsStore.personMap[partner.personId])
      : 'Persona no disponible'
  }))
})
const dateFilters = reactive({
  startDate: '',
  endDate: ''
})
const filteredEntries = computed(() => {
  return businessesStore.activeEntries.filter((entry) => {
    if (dateFilters.startDate && entry.date < dateFilters.startDate) {
      return false
    }

    if (dateFilters.endDate && entry.date > dateFilters.endDate) {
      return false
    }

    return true
  })
})
const recentEntries = computed(() => filteredEntries.value.slice(0, 5))
const hasDateFilters = computed(() => {
  return Boolean(dateFilters.startDate || dateFilters.endDate)
})
const dateFilterLabel = computed(() => {
  if (dateFilters.startDate && dateFilters.endDate) {
    return `Mostrando registros entre ${formatEntryDate(dateFilters.startDate)} y ${formatEntryDate(dateFilters.endDate)}.`
  }

  if (dateFilters.startDate) {
    return `Mostrando registros desde ${formatEntryDate(dateFilters.startDate)}.`
  }

  if (dateFilters.endDate) {
    return `Mostrando registros hasta ${formatEntryDate(dateFilters.endDate)}.`
  }

  return 'Mostrando todo el historial disponible.'
})
const clearDateFilters = () => {
  dateFilters.startDate = ''
  dateFilters.endDate = ''
}
const partnerContributionSummary = computed(() => {
  return buildBusinessPartnerContributionSummary(
    filteredEntries.value,
    businessesStore.activePartners,
    personsStore.personMap
  )
})
const hasPartnerContributionData = computed(() => {
  return partnerContributionSummary.value.some((item) => item.total > 0)
})
const hasRecentEntries = computed(() => {
  return recentEntries.value.length > 0
})
const canManageEntries = computed(() => authStore.canManageBusiness(businessId))
const canManageSettings = computed(() => authStore.canManageBusinessSettings)
const isEditingBusiness = ref(false)
const businessForm = reactive({
  name: '',
  kind: '',
  location: '',
  description: ''
})

watch(
  business,
  (currentBusiness) => {
    if (!currentBusiness || isEditingBusiness.value) {
      return
    }

    businessForm.name = currentBusiness.name
    businessForm.kind = currentBusiness.kind
    businessForm.location = currentBusiness.location
    businessForm.description = currentBusiness.description
  },
  { immediate: true }
)

const startEditingBusiness = () => {
  if (!business.value) {
    return
  }

  businessForm.name = business.value.name
  businessForm.kind = business.value.kind
  businessForm.location = business.value.location
  businessForm.description = business.value.description
  isEditingBusiness.value = true
}

const cancelEditingBusiness = () => {
  if (!business.value) {
    return
  }

  businessForm.name = business.value.name
  businessForm.kind = business.value.kind
  businessForm.location = business.value.location
  businessForm.description = business.value.description
  isEditingBusiness.value = false
}

const submitBusinessUpdate = async () => {
  if (!business.value) {
    return
  }

  try {
    const updatedBusiness = await businessesStore.updateBusiness({
      id: business.value.id,
      name: businessForm.name,
      kind: businessForm.kind,
      location: businessForm.location,
      description: businessForm.description
    })

    isEditingBusiness.value = false
    toastStore.success('Negocio actualizado', `${updatedBusiness.name} fue actualizado correctamente.`)
  } catch (error) {
    toastStore.error(
      'No se pudo actualizar el negocio',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}

const removeBusiness = async () => {
  if (!business.value) {
    return
  }

  if (!window.confirm(`¿Eliminar ${business.value.name}? También se borrarán sus socios y movimientos.`)) {
    return
  }

  const businessName = business.value.name

  try {
    await businessesStore.deleteBusiness(business.value.id)
    toastStore.successAfterNavigation('Negocio eliminado', `${businessName} fue eliminado del portafolio.`)
    await navigateTo('/businesses')
  } catch (error) {
    toastStore.error(
      'No se pudo eliminar el negocio',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}
</script>

<template>
  <section v-if="business && summary" class="space-y-6">
    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-maize-300">{{ business.kind }}</p>
          <h2 class="mt-3 text-3xl font-semibold text-stone-50">{{ business.name }}</h2>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-stone-300">{{ business.description }}</p>
          <p class="mt-4 text-sm text-stone-400">{{ business.location }}</p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <NuxtLink
            to="/businesses"
            class="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-stone-100 transition hover:border-white/20"
          >
            Volver al listado
          </NuxtLink>
          <NuxtLink
            v-if="canManageEntries"
            :to="`/businesses/${business.id}/entries`"
            class="rounded-2xl bg-leaf-500 px-4 py-3 text-center text-sm font-semibold text-soil-950 transition hover:bg-leaf-400"
          >
            Registrar movimiento
          </NuxtLink>
          <button
            v-if="canManageSettings"
            class="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-stone-100 transition hover:border-maize-300 hover:text-maize-100"
            type="button"
            @click="startEditingBusiness"
          >
            Editar negocio
          </button>
          <button
            v-if="canManageSettings"
            class="rounded-2xl border border-rose-500/30 px-4 py-3 text-center text-sm font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
            type="button"
            @click="removeBusiness"
          >
            Eliminar negocio
          </button>
        </div>
      </div>
    </article>

    <article v-if="!canManageEntries" class="surface-card rounded-[2rem] border border-maize-400/20 px-6 py-5 sm:px-8">
      <p class="text-xs uppercase tracking-[0.3em] text-maize-200">Solo lectura</p>
      <p class="mt-3 text-sm leading-7 text-stone-300">
        Tu rol puede consultar este negocio, pero no crear ni modificar registros operativos.
      </p>
    </article>

    <article v-if="isEditingBusiness && canManageSettings" class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-5">
        <p class="text-xs uppercase tracking-[0.3em] text-leaf-300">Configuración</p>
        <h3 class="mt-2 text-xl font-semibold text-stone-50">Editar negocio</h3>
      </div>

      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitBusinessUpdate">
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Nombre</span>
          <input v-model="businessForm.name" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Tipo</span>
          <input v-model="businessForm.kind" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Ubicación</span>
          <input v-model="businessForm.location" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2 md:col-span-2">
          <span class="text-sm text-stone-200">Descripción</span>
          <textarea v-model="businessForm.description" class="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required />
        </label>
        <div class="flex flex-col gap-3 md:col-span-2 sm:flex-row">
          <button class="rounded-2xl bg-leaf-500 px-4 py-3 text-sm font-semibold text-soil-950 transition hover:bg-leaf-400 disabled:opacity-60" :disabled="businessesStore.saving" type="submit">
            {{ businessesStore.saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <button class="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-white/20" type="button" @click="cancelEditingBusiness">
            Cancelar
          </button>
        </div>
      </form>
    </article>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard accent="maize" label="Invertido" :value="formatCurrency(summary.totalInvested, business.currency)" hint="Incluye activos comprados" />
      <KpiCard accent="stone" label="Gastos" :value="formatCurrency(summary.totalExpenses, business.currency)" hint="Operación registrada" />
      <KpiCard accent="leaf" label="Ventas" :value="formatCurrency(summary.totalSales, business.currency)" :hint="`Último movimiento ${formatEntryDate(summary.latestEntryAt)}`" />
      <KpiCard accent="leaf" label="ROI" :value="formatPercent(summary.roi)" :hint="`Utilidad ${formatCurrency(summary.netProfit, business.currency)}`" />
    </div>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Filtro temporal</p>
          <h3 class="mt-2 text-xl font-semibold text-stone-50">Historial y gráfica por rango</h3>
          <p class="mt-2 text-sm text-stone-300">
            Ajusta las fechas para revisar solo los movimientos del periodo que quieras analizar.
          </p>
        </div>

        <button
          v-if="hasDateFilters"
          class="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-white/20"
          type="button"
          @click="clearDateFilters"
        >
          Limpiar filtros
        </button>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Desde</span>
          <input
            v-model="dateFilters.startDate"
            class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400"
            :max="dateFilters.endDate || undefined"
            type="date"
          >
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Hasta</span>
          <input
            v-model="dateFilters.endDate"
            class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400"
            :min="dateFilters.startDate || undefined"
            type="date"
          >
        </label>
      </div>

      <p class="mt-4 text-sm text-stone-400">{{ dateFilterLabel }}</p>
    </article>

    <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8 bg-gradient-to-br from-sky-500/5 to-cyan-500/5 border border-sky-500/10">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Actividad</p>
            <h3 class="mt-2 text-xl font-semibold text-stone-50">Movimientos recientes</h3>
            <p class="mt-2 text-sm text-stone-300">{{ dateFilterLabel }}</p>
          </div>
          <NuxtLink :to="`/businesses/${business.id}/entries`" class="text-sm font-medium text-maize-200 transition hover:text-maize-100">
            Ver todos
          </NuxtLink>
        </div>

        <div v-if="hasRecentEntries" class="mt-5 space-y-3">
          <div
            v-for="entry in recentEntries"
            :key="entry.id"
            class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-stone-100">{{ entry.category }}</p>
                <p class="mt-1 text-xs uppercase tracking-[0.2em] text-stone-400">{{ entry.type }} · {{ entry.date }}</p>
              </div>
              <p class="text-sm font-semibold text-stone-50">{{ formatCurrency(entry.amount, business.currency) }}</p>
            </div>
            <p class="mt-3 text-sm text-stone-300">{{ entry.note }}</p>
          </div>
        </div>

        <div v-else class="mt-5 rounded-3xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-stone-400">
          {{ hasDateFilters ? 'No hay movimientos en el rango seleccionado.' : 'Todavía no hay movimientos registrados para este negocio.' }}
        </div>
      </article>

      <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Propiedad</p>
            <h3 class="mt-2 text-xl font-semibold text-stone-50">Socios y participación</h3>
          </div>
          <NuxtLink
            v-if="canManageEntries"
            :to="`/businesses/${business.id}/partners`"
            class="text-sm font-medium text-leaf-300 transition hover:text-leaf-200"
          >
            Administrar
          </NuxtLink>
        </div>

        <div class="mt-5 space-y-3">
          <div
            v-for="partner in partnerCards"
            :key="partner.id"
            class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <p class="font-medium text-stone-100">{{ partner.displayName }}</p>
                <span v-if="partner.isArchived" class="rounded-full bg-rose-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">
                  Archivada
                </span>
              </div>
              <span class="rounded-full bg-maize-400/15 px-3 py-1 text-sm font-semibold text-maize-200">{{ partner.share }}%</span>
            </div>
            <p class="mt-2 text-sm text-stone-300">{{ partner.contributionFocus }}</p>
          </div>
        </div>
      </article>
    </div>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Distribución</p>
          <h3 class="mt-2 text-xl font-semibold text-stone-50">Gastos e inversiones por socio</h3>
          <p class="mt-2 text-sm text-stone-300">
            La gráfica separa gastos e inversiones por socio dentro del rango activo, más los movimientos históricos sin asignación explícita.
          </p>
          <p class="mt-2 text-sm text-stone-400">{{ dateFilterLabel }}</p>
        </div>
      </div>

      <div v-if="hasPartnerContributionData" class="mt-6 space-y-6">
        <PartnerContributionBarChart :items="partnerContributionSummary" :currency="business.currency" />

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="item in partnerContributionSummary"
            :key="item.key"
            class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="font-medium text-stone-100">{{ item.label }}</p>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                :class="item.isUnassigned ? 'bg-rose-400/15 text-rose-200' : 'bg-maize-400/15 text-maize-200'"
              >
                {{ item.isUnassigned ? 'Legacy' : 'Socio' }}
              </span>
            </div>
            <p class="mt-3 text-lg font-semibold text-stone-50">{{ formatCurrency(item.total, business.currency) }}</p>
            <div class="mt-3 grid gap-2 text-sm text-stone-300 sm:grid-cols-2">
              <p>Gastos {{ formatCurrency(item.expense, business.currency) }}</p>
              <p>Inversiones {{ formatCurrency(item.investment, business.currency) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mt-6 rounded-3xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-stone-400">
        {{ hasDateFilters
          ? 'No hay gastos o inversiones en el rango seleccionado para construir la gráfica por socio.'
          : 'Todavía no hay gastos o inversiones suficientes para construir la gráfica por socio en este negocio.' }}
      </div>
    </article>
  </section>

  <section v-else class="surface-card rounded-[2rem] px-6 py-7 text-center">
    <p class="text-sm text-stone-300">No se encontró el negocio solicitado.</p>
  </section>
</template>