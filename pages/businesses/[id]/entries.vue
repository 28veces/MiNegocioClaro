<script setup lang="ts">
import { formatCurrency } from '~/composables/useBusinessSummary'
import type { EntryAssignmentMode, EntryType, FinancialEntry } from '~/types/domain'
import { entryTypeOptions, entryTypeSupportsAssignment, getPersonFullName } from '~/types/domain'

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
await auditStore.hydrateEntryEvents(businessId)

const business = computed(() => businessesStore.activeBusiness)
const entries = computed(() => businessesStore.activeEntries)
const partners = computed(() => businessesStore.activePartners)
const entryEvents = computed(() => auditStore.entryEvents(businessId))
const editingEntryId = ref<string | null>(null)
const editingEntry = computed(() => {
  if (!editingEntryId.value) {
    return null
  }

  return entries.value.find((entry) => entry.id === editingEntryId.value) ?? null
})

const partnerOptions = computed(() => {
  const seenPeople = new Set<string>()

  return partners.value
    .filter((partner) => {
      if (seenPeople.has(partner.personId)) {
        return false
      }

      seenPeople.add(partner.personId)
      return true
    })
    .map((partner) => {
      const person = personsStore.personMap[partner.personId]

      return {
        personId: partner.personId,
        label: person ? getPersonFullName(person) : 'Persona no disponible'
      }
    })
})

const form = reactive({
  type: 'expense' as EntryType,
  category: '',
  amount: 0,
  note: '',
  date: new Date().toISOString().slice(0, 10),
  assignmentMode: 'all' as EntryAssignmentMode,
  assignedPersonId: ''
})

const supportsAssignment = computed(() => entryTypeSupportsAssignment(form.type))
const showLegacyUnassignedOption = computed(() => {
  return Boolean(
    editingEntry.value
    && supportsAssignment.value
    && (editingEntry.value.assignmentMode ?? 'unassigned') === 'unassigned'
  )
})

const buildEqualSplitPreview = (personIds: string[], amount: number) => {
  const normalizedAmount = Number(amount.toFixed(2))
  const baseAmount = Number((normalizedAmount / personIds.length).toFixed(2))
  const preview = personIds.map((personId) => ({ personId, amount: baseAmount }))
  const assignedAmount = Number(preview.reduce((total, item) => total + item.amount, 0).toFixed(2))
  const remainder = Number((normalizedAmount - assignedAmount).toFixed(2))

  if (remainder !== 0 && preview.length) {
    preview[preview.length - 1].amount = Number((preview[preview.length - 1].amount + remainder).toFixed(2))
  }

  return preview
}

const assignmentPreview = computed(() => {
  if (!supportsAssignment.value || Number(form.amount) <= 0) {
    return []
  }

  if (form.assignmentMode === 'person' && form.assignedPersonId) {
    return [{
      personId: form.assignedPersonId,
      label: partnerOptions.value.find((partner) => partner.personId === form.assignedPersonId)?.label ?? 'Socio seleccionado',
      amount: Number(form.amount)
    }]
  }

  if (form.assignmentMode === 'all' && partnerOptions.value.length) {
    return buildEqualSplitPreview(
      partnerOptions.value.map((partner) => partner.personId),
      Number(form.amount)
    ).map((item) => ({
      ...item,
      label: partnerOptions.value.find((partner) => partner.personId === item.personId)?.label ?? 'Socio del negocio'
    }))
  }

  return []
})

const getEntryAssignmentLabel = (entry: FinancialEntry) => {
  if (!entryTypeSupportsAssignment(entry.type)) {
    return null
  }

  const assignmentMode = entry.assignmentMode ?? 'unassigned'

  if (assignmentMode === 'person' && entry.assignedPersonId) {
    return partnerOptions.value.find((partner) => partner.personId === entry.assignedPersonId)?.label
      ?? personsStore.personMap[entry.assignedPersonId]
        ? getPersonFullName(personsStore.personMap[entry.assignedPersonId])
        : 'Socio asignado'
  }

  if (assignmentMode === 'all') {
    return `Todos (${entry.assignments?.length ?? 0} socios)`
  }

  return 'Sin asignación'
}

const entryCards = computed(() => {
  return entries.value.map((entry) => ({
    ...entry,
    assignmentLabel: getEntryAssignmentLabel(entry)
  }))
})

const syncCreateAssignmentDefaults = (entryType: EntryType) => {
  if (editingEntryId.value) {
    return
  }

  if (!entryTypeSupportsAssignment(entryType) || !partnerOptions.value.length) {
    form.assignmentMode = 'unassigned'
    form.assignedPersonId = ''
    return
  }

  if (form.assignmentMode === 'unassigned') {
    form.assignmentMode = 'all'
  }

  if (form.assignmentMode === 'person' && !partnerOptions.value.some((partner) => partner.personId === form.assignedPersonId)) {
    form.assignedPersonId = partnerOptions.value[0]?.personId ?? ''
  }

  if (form.assignmentMode === 'all') {
    form.assignedPersonId = ''
  }
}

watch(
  [() => form.type, partnerOptions],
  ([entryType]) => {
    syncCreateAssignmentDefaults(entryType)
  },
  { immediate: true }
)

const resetForm = () => {
  form.type = 'expense'
  form.category = ''
  form.amount = 0
  form.note = ''
  form.date = new Date().toISOString().slice(0, 10)
  form.assignmentMode = partnerOptions.value.length ? 'all' : 'unassigned'
  form.assignedPersonId = ''
  editingEntryId.value = null
}

const startEditingEntry = (entry: FinancialEntry) => {
  editingEntryId.value = entry.id
  form.type = entry.type
  form.category = entry.category
  form.amount = entry.amount
  form.note = entry.note
  form.date = entry.date
  form.assignmentMode = entry.assignmentMode ?? 'unassigned'
  form.assignedPersonId = entry.assignedPersonId ?? ''
}

const cancelEditing = () => {
  resetForm()
}

const resolveAssignmentPayload = () => {
  if (!supportsAssignment.value) {
    return {
      assignmentMode: undefined,
      assignedPersonId: undefined
    }
  }

  if (!partnerOptions.value.length) {
    throw new Error('Agrega al menos un socio al negocio antes de registrar gastos o inversiones asignadas.')
  }

  if (form.assignmentMode === 'person') {
    if (!form.assignedPersonId) {
      throw new Error('Selecciona el socio responsable de este movimiento.')
    }

    return {
      assignmentMode: 'person' as EntryAssignmentMode,
      assignedPersonId: form.assignedPersonId
    }
  }

  if (form.assignmentMode === 'all') {
    return {
      assignmentMode: 'all' as EntryAssignmentMode,
      assignedPersonId: undefined
    }
  }

  return {
    assignmentMode: 'unassigned' as EntryAssignmentMode,
    assignedPersonId: undefined
  }
}

const submit = async () => {
  if (Number(form.amount) <= 0) {
    toastStore.error('Monto inválido', 'El monto debe ser mayor a cero.')
    return
  }

  try {
    const assignmentPayload = resolveAssignmentPayload()

    if (editingEntryId.value) {
      await businessesStore.updateEntry({
        id: editingEntryId.value,
        businessId,
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        note: form.note,
        date: form.date,
        recordedBy: authStore.user?.name ?? 'Operador',
        ...assignmentPayload
      })
      await auditStore.hydrateEntryEvents(businessId)

      toastStore.success('Movimiento actualizado', `${form.category} fue actualizado correctamente.`)
    } else {
      await businessesStore.addEntry({
        businessId,
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        note: form.note,
        date: form.date,
        recordedBy: authStore.user?.name ?? 'Operador',
        ...assignmentPayload
      })
      await auditStore.hydrateEntryEvents(businessId)

      toastStore.success('Movimiento registrado', `${form.category} fue agregado al historial.`)
    }

    resetForm()
  } catch (error) {
    toastStore.error(
      editingEntryId.value ? 'No se pudo actualizar el movimiento' : 'No se pudo registrar el movimiento',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}

const removeEntry = async (entry: FinancialEntry) => {
  if (!window.confirm(`¿Eliminar el movimiento ${entry.category}?`)) {
    return
  }

  try {
    await businessesStore.deleteEntry(businessId, entry.id)
    await auditStore.hydrateEntryEvents(businessId)

    if (editingEntryId.value === entry.id) {
      resetForm()
    }

    toastStore.success('Movimiento eliminado', `${entry.category} fue retirado del historial.`)
  } catch (error) {
    toastStore.error(
      'No se pudo eliminar el movimiento',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}
</script>

<template>
  <section v-if="business" class="space-y-6">
    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <p class="text-xs uppercase tracking-[0.35em] text-maize-300">Movimientos</p>
      <h2 class="mt-3 text-3xl font-semibold text-stone-50">{{ business.name }}</h2>
      <p class="mt-3 text-sm leading-7 text-stone-300">
        Registra inversiones, gastos, ventas o compras de activos para alimentar el panel de rentabilidad.
      </p>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-5">
        <p class="text-xs uppercase tracking-[0.3em] text-leaf-300">Captura</p>
        <h3 class="mt-2 text-xl font-semibold text-stone-50">{{ editingEntry ? 'Editar movimiento' : 'Registrar movimiento' }}</h3>
        <p class="mt-2 text-sm text-stone-300">
          {{ editingEntry ? 'Modifica los datos del movimiento seleccionado y guarda los cambios.' : 'Registra nuevas inversiones, gastos, ventas o activos del negocio.' }}
        </p>
      </div>

      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submit">
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Tipo</span>
          <select v-model="form.type" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400">
            <option v-for="option in entryTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Categoría</span>
          <input v-model="form.category" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Monto</span>
          <input v-model="form.amount" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" min="0" step="0.01" required type="number">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Fecha</span>
          <input v-model="form.date" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="date">
        </label>
        <label class="block space-y-2 md:col-span-2">
          <span class="text-sm text-stone-200">Descripción</span>
          <textarea v-model="form.note" class="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required />
        </label>

        <div v-if="supportsAssignment" class="rounded-[1.75rem] border border-white/10 bg-black/10 px-4 py-4 md:col-span-2">
          <div class="flex flex-col gap-2">
            <p class="text-xs uppercase tracking-[0.3em] text-leaf-300">Titularidad</p>
            <p class="text-sm text-stone-300">
              Define si este {{ form.type === 'expense' ? 'gasto' : 'inversión' }} pertenece a un socio específico o a todos.
            </p>
          </div>

          <div v-if="partnerOptions.length" class="mt-4 space-y-3">
            <label class="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-stone-100">
              <input
                class="h-4 w-4 accent-maize-300"
                name="entry-assignment"
                type="radio"
                :checked="form.assignmentMode === 'all'"
                @change="form.assignmentMode = 'all'; form.assignedPersonId = ''"
              >
              <span>Todos los socios</span>
            </label>

            <label
              v-for="partner in partnerOptions"
              :key="partner.personId"
              class="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-stone-100"
            >
              <input
                class="h-4 w-4 accent-maize-300"
                name="entry-assignment"
                type="radio"
                :checked="form.assignmentMode === 'person' && form.assignedPersonId === partner.personId"
                @change="form.assignmentMode = 'person'; form.assignedPersonId = partner.personId"
              >
              <span>{{ partner.label }}</span>
            </label>

            <div v-if="form.assignmentMode === 'person'" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <label class="block space-y-2">
                <span class="text-sm text-stone-200">Socio responsable</span>
                <select v-model="form.assignedPersonId" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400">
                  <option disabled value="">Selecciona un socio</option>
                  <option v-for="partner in partnerOptions" :key="partner.personId" :value="partner.personId">
                    {{ partner.label }}
                  </option>
                </select>
              </label>
            </div>

            <div class="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-stone-300">
              <p class="font-medium text-stone-100">Vista previa del reparto</p>
              <div v-if="assignmentPreview.length" class="mt-3 space-y-2">
                <div v-for="assignment in assignmentPreview" :key="assignment.personId" class="flex items-center justify-between gap-4">
                  <span>{{ assignment.label }}</span>
                  <span class="font-medium text-maize-200">{{ formatCurrency(assignment.amount, business.currency) }}</span>
                </div>
              </div>
              <p v-else class="mt-3 text-stone-400">Selecciona una titularidad y un monto para ver el reparto.</p>
            </div>

            <p v-if="showLegacyUnassignedOption" class="text-xs uppercase tracking-[0.2em] text-stone-500">
              Este movimiento venía sin asignación histórica y puedes conservarlo así si no cambias la titularidad.
            </p>
          </div>

          <div v-else class="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-stone-300">
            Este negocio todavía no tiene socios activos para asignar este movimiento.
          </div>
        </div>

        <div class="flex flex-col gap-3 md:col-span-2 sm:flex-row">
          <button class="rounded-2xl bg-maize-400 px-4 py-3 text-sm font-semibold text-soil-950 transition hover:bg-maize-300 disabled:opacity-60" :disabled="businessesStore.saving" type="submit">
            {{ businessesStore.saving ? 'Guardando...' : editingEntry ? 'Guardar cambios' : 'Registrar movimiento' }}
          </button>
          <button v-if="editingEntry" class="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-white/20" type="button" @click="cancelEditing">
            Cancelar edición
          </button>
        </div>
      </form>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h3 class="text-xl font-semibold text-stone-50">Historial</h3>
        <NuxtLink :to="`/businesses/${business.id}`" class="text-sm font-medium text-leaf-300 transition hover:text-leaf-200">
          Volver al detalle
        </NuxtLink>
      </div>

      <div class="space-y-3">
        <div
          v-for="entry in entryCards"
          :key="entry.id"
          class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="font-medium text-stone-100">{{ entry.category }}</p>
              <p class="mt-1 text-xs uppercase tracking-[0.2em] text-stone-400">{{ entry.type }} · {{ entry.date }} · {{ entry.recordedBy }}</p>
              <p v-if="entry.assignmentLabel" class="mt-2 text-xs uppercase tracking-[0.2em] text-maize-200">{{ entry.assignmentLabel }}</p>
              <p class="mt-3 text-sm text-stone-300">{{ entry.note }}</p>
            </div>
            <div class="flex flex-col items-start gap-3 sm:items-end">
              <p class="text-sm font-semibold text-stone-50">{{ formatCurrency(entry.amount, business.currency) }}</p>
              <div class="flex gap-2">
                <button class="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-100 transition hover:border-maize-300 hover:text-maize-100" type="button" @click="startEditingEntry(entry)">
                  Editar
                </button>
                <button class="rounded-full border border-rose-500/30 px-3 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100" type="button" @click="removeEntry(entry)">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!entries.length" class="rounded-3xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-stone-400">
          Todavía no hay movimientos registrados en este negocio.
        </div>
      </div>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-4">
        <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Auditoría</p>
        <h3 class="mt-2 text-xl font-semibold text-stone-50">Cambios recientes en movimientos</h3>
      </div>

      <AuditTimeline :events="entryEvents" empty-label="Todavía no hay cambios auditados sobre movimientos en este negocio." />
    </article>
  </section>
</template>