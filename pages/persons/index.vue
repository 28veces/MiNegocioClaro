<script setup lang="ts">
import { getPersonFullName } from '~/types/domain'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredAccess: 'admin'
})

const authStore = useAuthStore()
const personsStore = usePersonsStore()
const auditStore = useAuditStore()
const toastStore = useToastStore()

await authStore.initialize()
await personsStore.hydrate(true)
await auditStore.hydratePersonEvents()

const search = ref('')
const editingPersonId = ref<string | null>(null)
const form = reactive({
  firstName: '',
  lastName: '',
  documentNumber: '',
  email: ''
})

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const buildValidatedPayload = () => {
  const firstName = form.firstName.trim()
  const lastName = form.lastName.trim()
  const documentNumber = form.documentNumber.trim()
  const email = form.email.trim()

  if (!firstName) {
    throw new Error('Ingresa el nombre de la persona.')
  }

  if (!lastName) {
    throw new Error('Ingresa el apellido de la persona.')
  }

  if (!documentNumber) {
    throw new Error('Ingresa la cédula de la persona.')
  }

  if (email && !isValidEmail(email)) {
    throw new Error('Ingresa un correo válido o deja el campo vacío.')
  }

  return {
    firstName,
    lastName,
    documentNumber,
    email: email || undefined
  }
}

const visiblePersons = computed(() => {
  const normalizedSearch = search.value.trim().toLowerCase()

  if (!normalizedSearch) {
    return personsStore.persons
  }

  return personsStore.persons.filter((person) => {
    return [getPersonFullName(person), person.documentNumber, person.email ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })
})

const toggleArchived = async (personId: string, archived: boolean) => {
  const person = personsStore.personMap[personId]

  if (!person) {
    return
  }

  const actionLabel = archived ? 'archivar' : 'reactivar'

  if (!window.confirm(`¿${actionLabel === 'archivar' ? 'Archivar' : 'Reactivar'} a ${getPersonFullName(person)}?`)) {
    return
  }

  try {
    const updatedPerson = await personsStore.setArchived(personId, archived)
    await auditStore.hydratePersonEvents()

    if (editingPersonId.value === personId && archived) {
      resetForm()
    }

    toastStore.success(
      archived ? 'Persona archivada' : 'Persona reactivada',
      archived
        ? `${getPersonFullName(updatedPerson)} dejó de estar disponible para nuevas asociaciones.`
        : `${getPersonFullName(updatedPerson)} volvió a quedar disponible para asociarla a negocios.`
    )
  } catch (error) {
    toastStore.error(
      archived ? 'No se pudo archivar la persona' : 'No se pudo reactivar la persona',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}

const resetForm = () => {
  editingPersonId.value = null
  form.firstName = ''
  form.lastName = ''
  form.documentNumber = ''
  form.email = ''
}

const startEditing = (personId: string) => {
  const person = personsStore.personMap[personId]

  if (!person) {
    return
  }

  editingPersonId.value = person.id
  form.firstName = person.firstName
  form.lastName = person.lastName
  form.documentNumber = person.documentNumber
  form.email = person.email ?? ''
}

const submit = async () => {
  try {
    const payload = buildValidatedPayload()

    if (editingPersonId.value) {
      const person = await personsStore.updatePerson({
        id: editingPersonId.value,
        ...payload
      })
      await auditStore.hydratePersonEvents()

      toastStore.success('Persona actualizada', `${getPersonFullName(person)} fue actualizada correctamente.`)
      resetForm()
      return
    }

    const person = await personsStore.createPerson({
      ...payload
    })
    await auditStore.hydratePersonEvents()

    toastStore.success('Persona registrada', `${getPersonFullName(person)} ya está disponible para asociarla a negocios.`)
    resetForm()
  } catch (error) {
    toastStore.error(
      editingPersonId.value ? 'No se pudo actualizar la persona' : 'No se pudo registrar la persona',
      error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.'
    )
  }
}
</script>

<template>
  <section class="space-y-6">
    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <p class="text-xs uppercase tracking-[0.35em] text-maize-300">Directorio</p>
      <h2 class="mt-3 text-3xl font-semibold text-stone-50">Personas registradas</h2>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
        Registra personas una sola vez y reutilízalas después al asociarlas con negocios y participaciones.
      </p>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-leaf-300">Gestión</p>
          <h3 class="mt-2 text-xl font-semibold text-stone-50">
            {{ editingPersonId ? 'Editar persona' : 'Registrar persona' }}
          </h3>
        </div>

        <button
          v-if="editingPersonId"
          class="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-white/20"
          type="button"
          @click="resetForm"
        >
          Cancelar edición
        </button>
      </div>

      <form class="grid gap-4 md:grid-cols-2" novalidate @submit.prevent="submit">
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Nombre</span>
          <input v-model="form.firstName" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Apellido</span>
          <input v-model="form.lastName" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Cédula</span>
          <input v-model="form.documentNumber" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Correo (opcional)</span>
          <input v-model="form.email" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" inputmode="email" type="text">
        </label>
        <button
          class="rounded-2xl bg-leaf-500 px-4 py-3 text-sm font-semibold text-soil-950 transition hover:bg-leaf-400 disabled:opacity-60 md:col-span-2"
          :disabled="personsStore.saving"
          type="submit"
        >
          {{ personsStore.saving ? 'Guardando...' : editingPersonId ? 'Guardar cambios' : 'Registrar persona' }}
        </button>
      </form>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Consulta</p>
          <h3 class="mt-2 text-xl font-semibold text-stone-50">Catálogo reutilizable</h3>
        </div>

        <label class="block w-full max-w-sm space-y-2">
          <span class="text-sm text-stone-200">Buscar</span>
          <input
            v-model="search"
            class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400"
            placeholder="Nombre, cédula o correo"
            type="search"
          >
        </label>
      </div>

      <div v-if="visiblePersons.length" class="mt-5 space-y-3">
        <div
          v-for="person in visiblePersons"
          :key="person.id"
          class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="font-medium text-stone-100">{{ getPersonFullName(person) }}</p>
              <p class="mt-1 text-sm text-stone-300">Cédula {{ person.documentNumber }}</p>
              <p class="mt-1 text-sm text-stone-400">{{ person.email || 'Sin correo registrado' }}</p>
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                :class="person.archivedAt ? 'bg-rose-400/15 text-rose-200' : 'bg-maize-400/15 text-maize-200'"
              >
                {{ person.archivedAt ? 'Archivada' : 'Activa' }}
              </span>
              <span v-if="person.linkedUserId" class="rounded-full bg-leaf-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-200">
                Usuario vinculado
              </span>
              <button
                class="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200 transition hover:border-maize-300 hover:text-maize-100"
                type="button"
                @click="startEditing(person.id)"
              >
                Editar
              </button>
              <button
                class="rounded-full border px-3 py-1 text-xs font-medium transition"
                :class="person.archivedAt ? 'border-leaf-400/30 text-leaf-200 hover:border-leaf-300 hover:text-leaf-100' : 'border-rose-500/30 text-rose-200 hover:border-rose-400 hover:text-rose-100'"
                type="button"
                @click="toggleArchived(person.id, !person.archivedAt)"
              >
                {{ person.archivedAt ? 'Reactivar' : 'Archivar' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mt-5 rounded-3xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-stone-400">
        No hay personas que coincidan con la búsqueda actual.
      </div>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="mb-4">
        <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Auditoría</p>
        <h3 class="mt-2 text-xl font-semibold text-stone-50">Cambios recientes en personas</h3>
      </div>

      <AuditTimeline :events="auditStore.personEvents" empty-label="Todavía no hay cambios auditados sobre personas." />
    </article>
  </section>
</template>