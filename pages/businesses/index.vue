<script setup lang="ts">
import { buildBusinessSummary } from '~/composables/useBusinessSummary'
import { createUniqueId } from '~/lib/utils/id'
import { getPersonFullName } from '~/types/domain'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const businessesStore = useBusinessesStore()
const personsStore = usePersonsStore()
const toastStore = useToastStore()

await authStore.initialize()
await businessesStore.hydrateOverview(true)
await personsStore.hydrate(true)

const form = reactive({
  name: '',
  kind: 'Cultivo agroindustrial',
  location: '',
  description: ''
})

type InitialPartnerFormRow = {
  id: string
  search: string
  personId: string
  share: number
  contributionFocus: string
}

const createInitialPartnerRow = (): InitialPartnerFormRow => ({
  id: createUniqueId('initial-partner'),
  search: '',
  personId: '',
  share: 0,
  contributionFocus: ''
})

const initialPartners = ref<InitialPartnerFormRow[]>([])
const initialPartnersTotalShare = computed(() => {
  return Number(initialPartners.value.reduce((total, partner) => total + Number(partner.share || 0), 0).toFixed(2))
})
const initialPartnersRemainingShare = computed(() => {
  return Number(Math.max(0, 100 - initialPartnersTotalShare.value).toFixed(2))
})

const businessCards = computed(() => {
  return businessesStore.businesses.map((business) => ({
    business,
    summary: buildBusinessSummary(business.id, businessesStore.entriesByBusiness[business.id] ?? [])
  }))
})

const getFilteredPersons = (search: string) => {
  const normalizedSearch = search.trim().toLowerCase()
  const sourcePersons = personsStore.activePersons

  if (!normalizedSearch) {
    return sourcePersons
  }

  return sourcePersons.filter((person) => {
    return [getPersonFullName(person), person.documentNumber, person.email ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })
}

const addInitialPartnerRow = async () => {
  const row = createInitialPartnerRow()
  initialPartners.value.push(row)

  await nextTick()

  const searchInput = document.querySelector<HTMLInputElement>(`[data-initial-partner-search="${row.id}"]`)
  searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  searchInput?.focus()
}

const removeInitialPartnerRow = (partnerId: string) => {
  initialPartners.value = initialPartners.value.filter((partner) => partner.id !== partnerId)
}

const buildInitialPartners = () => {
  const selectedPeople = new Set<string>()

  if (initialPartnersTotalShare.value > 100) {
    throw new Error('La suma de participaciones iniciales no puede superar el 100%.')
  }

  return initialPartners.value.map((partner) => {
    if (!partner.personId) {
      throw new Error('Selecciona una persona válida para cada asociado inicial.')
    }

    if (selectedPeople.has(partner.personId)) {
      throw new Error('No puedes repetir la misma persona dentro de los asociados iniciales.')
    }

    if (Number(partner.share) <= 0) {
      throw new Error('La participación inicial debe ser mayor a cero.')
    }

    if (!partner.contributionFocus.trim()) {
      throw new Error('Describe el aporte principal de cada asociado inicial.')
    }

    selectedPeople.add(partner.personId)

    return {
      personId: partner.personId,
      share: Number(partner.share),
      contributionFocus: partner.contributionFocus.trim()
    }
  })
}

const submit = async () => {
  try {
    const business = await businessesStore.createBusiness({
      ...form,
      initialPartners: buildInitialPartners()
    })
    form.name = ''
    form.kind = 'Cultivo agroindustrial'
    form.location = ''
    form.description = ''
    initialPartners.value = []
    toastStore.successAfterNavigation('Negocio creado', `${business.name} ya está disponible en tu portafolio.`)
    await navigateTo(`/businesses/${business.id}`)
  } catch (error) {
    toastStore.error(
      'No se pudo crear el negocio',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}
</script>

<template>
  <section class="space-y-6">
    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <p class="text-xs uppercase tracking-[0.35em] text-maize-300">Catálogo</p>
      <h2 class="mt-3 text-3xl font-semibold text-stone-50">Negocios registrados</h2>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
        Desde aquí puedes revisar el portafolio y, si tienes permisos de administrador, abrir nuevas unidades de negocio.
      </p>
    </article>

    <article v-if="authStore.canCreateBusiness" class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-5">
        <p class="text-xs uppercase tracking-[0.3em] text-leaf-300">Alta rápida</p>
        <h3 class="mt-2 text-xl font-semibold text-stone-50">Crear negocio</h3>
        <p class="mt-2 text-sm text-stone-300">La moneda operativa queda configurada internamente con el valor por defecto del sistema.</p>
      </div>

      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submit">
        <label class="block space-y-2 md:col-span-1">
          <span class="text-sm text-stone-200">Nombre</span>
          <input v-model="form.name" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2 md:col-span-1">
          <span class="text-sm text-stone-200">Tipo</span>
          <input v-model="form.kind" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2 md:col-span-1">
          <span class="text-sm text-stone-200">Ubicación</span>
          <input v-model="form.location" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2 md:col-span-2">
          <span class="text-sm text-stone-200">Descripción</span>
          <textarea v-model="form.description" class="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required />
        </label>
        <div class="rounded-[1.75rem] border border-white/10 bg-black/10 px-4 py-4 md:col-span-2">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-maize-200">Asociados iniciales</p>
              <p class="mt-2 text-sm text-stone-300">
                Puedes asociar personas existentes desde el catálogo al mismo tiempo que creas el negocio.
              </p>
            </div>

            <button
              class="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-white/20 disabled:opacity-50"
              :disabled="!personsStore.activePersons.length || initialPartnersRemainingShare <= 0"
              type="button"
              @click="addInitialPartnerRow"
            >
              Agregar asociado
            </button>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Participación comprometida</p>
              <p class="mt-2 text-2xl font-semibold text-stone-50">{{ initialPartnersTotalShare }}%</p>
            </div>
            <div class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Participación disponible</p>
              <p class="mt-2 text-2xl font-semibold" :class="initialPartnersRemainingShare === 0 ? 'text-rose-200' : 'text-leaf-200'">
                {{ initialPartnersRemainingShare }}%
              </p>
            </div>
          </div>

          <p v-if="initialPartnersTotalShare > 100" class="mt-4 rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            La suma de participaciones iniciales supera el 100%. Ajusta los porcentajes antes de crear el negocio.
          </p>

          <div v-if="personsStore.activePersons.length && initialPartners.length" class="mt-5 space-y-4">
            <div
              v-for="partner in initialPartners"
              :key="partner.id"
              class="grid gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 lg:grid-cols-[1fr_1fr_160px_1fr_auto]"
            >
              <label class="block space-y-2">
                <span class="text-sm text-stone-200">Buscar persona</span>
                <input
                  v-model="partner.search"
                  class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400"
                  :data-initial-partner-search="partner.id"
                  placeholder="Nombre, cédula o correo"
                  type="search"
                >
              </label>
              <label class="block space-y-2">
                <span class="text-sm text-stone-200">Persona</span>
                <select v-model="partner.personId" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400">
                  <option disabled value="">Selecciona una persona</option>
                  <option v-for="person in getFilteredPersons(partner.search)" :key="person.id" :value="person.id">
                    {{ getPersonFullName(person) }} · {{ person.documentNumber }}
                  </option>
                </select>
              </label>
              <label class="block space-y-2">
                <span class="text-sm text-stone-200">Participación (%)</span>
                <input v-model="partner.share" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" max="100" min="0.01" step="0.01" type="number">
              </label>
              <label class="block space-y-2">
                <span class="text-sm text-stone-200">Aporte principal</span>
                <input v-model="partner.contributionFocus" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" placeholder="Capital, operación, comercialización..." type="text">
              </label>
              <div class="flex items-end">
                <button
                  class="w-full rounded-2xl border border-rose-500/30 px-4 py-3 text-sm font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
                  type="button"
                  @click="removeInitialPartnerRow(partner.id)"
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="!personsStore.activePersons.length" class="mt-5 rounded-3xl border border-dashed border-white/10 px-4 py-4 text-sm text-stone-300">
            Aún no hay personas activas registradas para asociar.
            <NuxtLink to="/persons" class="font-medium text-maize-200 transition hover:text-maize-100">
              Ir al catálogo de personas
            </NuxtLink>
          </div>
        </div>
        <button
          class="rounded-2xl bg-leaf-500 px-4 py-3 text-sm font-semibold text-soil-950 transition hover:bg-leaf-400 disabled:opacity-60 md:col-span-2"
          :disabled="businessesStore.saving || initialPartnersTotalShare > 100"
          type="submit"
        >
          {{ businessesStore.saving ? 'Creando...' : 'Crear negocio' }}
        </button>
      </form>
    </article>

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
</template>