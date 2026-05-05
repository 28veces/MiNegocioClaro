<script setup lang="ts">
import { getPersonFullName } from '~/types/domain'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredAccess: 'manage'
})

const route = useRoute()
const authStore = useAuthStore()
const businessesStore = useBusinessesStore()
const personsStore = usePersonsStore()
const auditStore = useAuditStore()
const toastStore = useToastStore()
const businessId = route.params.id as string

await authStore.initialize()
await businessesStore.openBusiness(businessId)
await personsStore.hydrate(true)
await auditStore.hydratePartnerEvents(businessId)

const business = computed(() => businessesStore.activeBusiness)
const partners = computed(() => businessesStore.activePartners)
const editingPartnerId = ref<string | null>(null)
const partnerEvents = computed(() => auditStore.partnerEvents(businessId))
const totalShare = computed(() => {
  return Number(partners.value.reduce((total, partner) => total + partner.share, 0).toFixed(2))
})
const shareAvailableForForm = computed(() => {
  const baseTotal = totalShare.value - (editablePartner.value?.share ?? 0)
  return Number(Math.max(0, 100 - baseTotal).toFixed(2))
})
const projectedShare = computed(() => {
  const draftShare = Number(form.share) || 0
  const baseTotal = totalShare.value - (editablePartner.value?.share ?? 0)
  return Number((baseTotal + draftShare).toFixed(2))
})
const partnerCards = computed(() => {
  return partners.value.map((partner) => ({
    ...partner,
    isArchived: Boolean(personsStore.personMap[partner.personId]?.archivedAt),
    displayName: personsStore.personMap[partner.personId]
      ? getPersonFullName(personsStore.personMap[partner.personId])
      : 'Persona no disponible'
  }))
})

const form = reactive({
  search: '',
  personId: '',
  share: 0,
  contributionFocus: ''
})

const editablePartner = computed(() => {
  return editingPartnerId.value
    ? partners.value.find((partner) => partner.id === editingPartnerId.value) ?? null
    : null
})

const selectablePersons = computed(() => {
  const blockedPersonIds = new Set(partners.value.map((partner) => partner.personId))
  const currentPartner = editablePartner.value

  if (currentPartner) {
    blockedPersonIds.delete(currentPartner.personId)
  }

  return personsStore.persons.filter((person) => {
    if (blockedPersonIds.has(person.id)) {
      return false
    }

    if (!person.archivedAt) {
      return true
    }

    return person.id === form.personId
  })
})

const filteredPersons = computed(() => {
  const normalizedSearch = form.search.trim().toLowerCase()

  if (!normalizedSearch) {
    return selectablePersons.value
  }

  return selectablePersons.value.filter((person) => {
    return [getPersonFullName(person), person.documentNumber, person.email ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })
})

const resetForm = () => {
  editingPartnerId.value = null
  form.search = ''
  form.personId = ''
  form.share = 0
  form.contributionFocus = ''
}

const startEditing = (partnerId: string) => {
  const partner = partners.value.find((currentPartner) => currentPartner.id === partnerId)
  const person = partner ? personsStore.personMap[partner.personId] : null

  if (!partner) {
    return
  }

  editingPartnerId.value = partner.id
  form.search = person ? getPersonFullName(person) : ''
  form.personId = partner.personId
  form.share = partner.share
  form.contributionFocus = partner.contributionFocus
}

const removePartner = async (partnerId: string, partnerName: string) => {
  if (!window.confirm(`¿Quitar a ${partnerName} de este negocio?`)) {
    return
  }

  try {
    await businessesStore.deletePartner(businessId, partnerId)
    await auditStore.hydratePartnerEvents(businessId)

    if (editingPartnerId.value === partnerId) {
      resetForm()
    }

    toastStore.success('Socio removido', `${partnerName} fue retirado de este negocio.`)
  } catch (error) {
    toastStore.error(
      'No se pudo remover el socio',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}

const submit = async () => {
  if (Number(form.share) <= 0) {
    toastStore.error('Participación inválida', 'La participación debe ser mayor a cero.')
    return
  }

  if (Number(form.share) > shareAvailableForForm.value) {
    toastStore.error(
      'Participación excedida',
      shareAvailableForForm.value > 0
        ? `La suma de participaciones no puede superar el 100%. Solo quedan ${shareAvailableForForm.value}% disponibles.`
        : 'La suma de participaciones ya completa el 100% de este negocio.'
    )
    return
  }

  try {
    if (editingPartnerId.value) {
      await businessesStore.updatePartner({
        id: editingPartnerId.value,
        businessId,
        personId: form.personId,
        share: Number(form.share),
        contributionFocus: form.contributionFocus
      })
      await auditStore.hydratePartnerEvents(businessId)

      toastStore.success('Socio actualizado', 'La asociación quedó actualizada correctamente.')
      resetForm()
      return
    }

    await businessesStore.addPartner({
      businessId,
      personId: form.personId,
      share: Number(form.share),
      contributionFocus: form.contributionFocus
    })
    await auditStore.hydratePartnerEvents(businessId)

    toastStore.success('Socio agregado', 'La participación quedó registrada en el negocio.')
    resetForm()
  } catch (error) {
    toastStore.error(
      editingPartnerId.value ? 'No se pudo actualizar el socio' : 'No se pudo agregar el socio',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}
</script>

<template>
  <section v-if="business" class="space-y-6">
    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <p class="text-xs uppercase tracking-[0.35em] text-leaf-300">Socios</p>
      <h2 class="mt-3 text-3xl font-semibold text-stone-50">{{ business.name }}</h2>
      <p class="mt-3 text-sm leading-7 text-stone-300">
        Registra nuevos socios y define su porcentaje de participación dentro del negocio.
      </p>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-leaf-300">Gestión</p>
          <h3 class="mt-2 text-xl font-semibold text-stone-50">
            {{ editingPartnerId ? 'Editar socio' : 'Agregar socio' }}
          </h3>
        </div>

        <button
          v-if="editingPartnerId"
          class="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-white/20"
          type="button"
          @click="resetForm"
        >
          Cancelar edición
        </button>
      </div>

      <div class="mb-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-3xl border border-white/10 bg-black/10 px-4 py-4">
          <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Participación actual</p>
          <p class="mt-2 text-2xl font-semibold text-stone-50">{{ totalShare }}%</p>
        </div>
        <div class="rounded-3xl border border-white/10 bg-black/10 px-4 py-4">
          <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Disponible</p>
          <p class="mt-2 text-2xl font-semibold text-leaf-200">{{ shareAvailableForForm }}%</p>
        </div>
        <div class="rounded-3xl border border-white/10 bg-black/10 px-4 py-4">
          <p class="text-xs uppercase tracking-[0.2em] text-stone-400">Total proyectado</p>
          <p class="mt-2 text-2xl font-semibold" :class="projectedShare > 100 ? 'text-rose-200' : 'text-maize-200'">
            {{ projectedShare }}%
          </p>
        </div>
      </div>

      <p v-if="shareAvailableForForm === 0 && !editingPartnerId" class="mb-5 rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        Este negocio ya distribuye el 100% de la participación. Edita o quita un socio para liberar cupo antes de agregar otro.
      </p>
      <p v-else-if="projectedShare > 100" class="mb-5 rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        El total proyectado supera el 100%. Reduce esta participación a {{ shareAvailableForForm }}% o menos.
      </p>

      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submit">
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Buscar persona</span>
          <input v-model="form.search" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-leaf-400" placeholder="Nombre, cédula o correo" type="search">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Persona a asociar</span>
          <select v-model="form.personId" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-leaf-400" required>
            <option disabled value="">Selecciona una persona del catálogo</option>
            <option v-for="person in filteredPersons" :key="person.id" :value="person.id">
              {{ getPersonFullName(person) }} · {{ person.documentNumber }}
            </option>
          </select>
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Participación (%)</span>
          <input v-model="form.share" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-leaf-400" :max="shareAvailableForForm" min="0.01" required step="0.01" type="number">
        </label>
        <label class="block space-y-2 md:col-span-2">
          <span class="text-sm text-stone-200">Enfoque o aporte</span>
          <textarea v-model="form.contributionFocus" class="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-leaf-400" required />
        </label>
        <button class="rounded-2xl bg-leaf-500 px-4 py-3 text-sm font-semibold text-soil-950 transition hover:bg-leaf-400 md:col-span-2" :disabled="businessesStore.saving" type="submit">
          {{ businessesStore.saving ? 'Guardando...' : editingPartnerId ? 'Guardar cambios' : 'Agregar socio' }}
        </button>
      </form>

      <div v-if="!personsStore.activePersons.length && !editingPartnerId" class="mt-5 rounded-3xl border border-dashed border-white/10 px-4 py-4 text-sm text-stone-300">
        No hay personas activas registradas todavía.
        <NuxtLink v-if="authStore.canManagePeople" to="/persons" class="font-medium text-maize-200 transition hover:text-maize-100">
          Ir al catálogo de personas
        </NuxtLink>
        <span v-else class="text-stone-400">Pídele a un administrador que complete el catálogo.</span>
      </div>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h3 class="text-xl font-semibold text-stone-50">Listado actual</h3>
        <NuxtLink :to="`/businesses/${business.id}`" class="text-sm font-medium text-maize-200 transition hover:text-maize-100">
          Volver al detalle
        </NuxtLink>
      </div>

      <div class="space-y-3">
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
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              class="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200 transition hover:border-maize-300 hover:text-maize-100"
              type="button"
              @click="startEditing(partner.id)"
            >
              Editar
            </button>
            <button
              class="rounded-full border border-rose-500/30 px-3 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
              type="button"
              @click="removePartner(partner.id, partner.displayName)"
            >
              Quitar
            </button>
          </div>
        </div>
      </div>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-4">
        <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Auditoría</p>
        <h3 class="mt-2 text-xl font-semibold text-stone-50">Cambios recientes en socios</h3>
      </div>

      <AuditTimeline :events="partnerEvents" empty-label="Todavía no hay cambios auditados sobre socios en este negocio." />
    </article>
  </section>
</template>