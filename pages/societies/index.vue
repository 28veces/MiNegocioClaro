<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredAccess: 'admin'
})

const authStore = useAuthStore()
const businessesStore = useBusinessesStore()
const societyStore = useSocietyStore()
const toastStore = useToastStore()

await authStore.initialize()
await businessesStore.hydrateOverview(true)
await societyStore.hydrate(true)

const createForm = reactive({
  name: '',
  description: ''
})
const showCreateForm = ref(false)

const addingBusinessToSociety = ref<string | null>(null)
const selectedBusinessId = ref('')

const addingMemberToSociety = ref<string | null>(null)
const memberEmailInput = ref('')
const foundUser = ref<{ id: string; name: string; email: string; role: string } | null>(null)
const searchingUser = ref(false)

const submitCreateSociety = async () => {
  if (!createForm.name.trim()) {
    toastStore.error('Campo requerido', 'El nombre de la sociedad es obligatorio.')
    return
  }

  try {
    await societyStore.createSociety({
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined
    })

    createForm.name = ''
    createForm.description = ''
    showCreateForm.value = false
    toastStore.success('Sociedad creada', 'Ya puedes agregar negocios y miembros.')
  } catch (error) {
    toastStore.error('Error al crear sociedad', error instanceof Error ? error.message : 'Intenta de nuevo.')
  }
}

const openAddBusiness = (societyId: string) => {
  addingBusinessToSociety.value = societyId
  selectedBusinessId.value = ''
}

const availableBusinessesForSociety = (societyId: string) => {
  const society = societyStore.societies.find((currentSociety) => currentSociety.id === societyId)

  return businessesStore.businesses.filter((business) => {
    return !society?.businessIds.includes(business.id)
  })
}

const submitAddBusiness = async () => {
  if (!addingBusinessToSociety.value || !selectedBusinessId.value) {
    return
  }

  try {
    await societyStore.addBusiness(addingBusinessToSociety.value, selectedBusinessId.value)
    toastStore.success('Negocio agregado', 'El negocio quedó incluido en la sociedad.')
    addingBusinessToSociety.value = null
    selectedBusinessId.value = ''
  } catch (error) {
    toastStore.error('No se pudo agregar el negocio', error instanceof Error ? error.message : 'Intenta de nuevo.')
  }
}

const removeBusiness = async (societyId: string, businessId: string) => {
  if (!window.confirm('¿Quitar este negocio de la sociedad?')) {
    return
  }

  try {
    await societyStore.removeBusiness(societyId, businessId)
    toastStore.success('Negocio removido', 'El negocio ya no se comparte en esta sociedad.')
  } catch (error) {
    toastStore.error('No se pudo quitar el negocio', error instanceof Error ? error.message : 'Intenta de nuevo.')
  }
}

const openAddMember = (societyId: string) => {
  addingMemberToSociety.value = societyId
  memberEmailInput.value = ''
  foundUser.value = null
}

const searchUser = async () => {
  if (!memberEmailInput.value.trim()) {
    return
  }

  searchingUser.value = true
  foundUser.value = null

  try {
    const user = await societyStore.findUserByEmail(memberEmailInput.value.trim())

    if (!user) {
      toastStore.warning('Sin resultados', 'No existe un usuario con ese correo.')
      return
    }

    foundUser.value = user
  } catch (error) {
    toastStore.error('No se pudo buscar el usuario', error instanceof Error ? error.message : 'Intenta de nuevo.')
  } finally {
    searchingUser.value = false
  }
}

const submitAddMember = async () => {
  if (!addingMemberToSociety.value || !foundUser.value) {
    return
  }

  try {
    await societyStore.addMember(addingMemberToSociety.value, foundUser.value)
    toastStore.success('Miembro agregado', 'Este usuario ahora podrá ver los negocios de la sociedad.')
    addingMemberToSociety.value = null
    memberEmailInput.value = ''
    foundUser.value = null
  } catch (error) {
    toastStore.error('No se pudo agregar el miembro', error instanceof Error ? error.message : 'Intenta de nuevo.')
  }
}

const removeMember = async (societyId: string, userId: string) => {
  if (!window.confirm('¿Revocar acceso de este miembro?')) {
    return
  }

  try {
    await societyStore.removeMember(societyId, userId)
    toastStore.success('Acceso removido', 'El miembro ya no tendrá acceso a esta sociedad.')
  } catch (error) {
    toastStore.error('No se pudo revocar el acceso', error instanceof Error ? error.message : 'Intenta de nuevo.')
  }
}

const deleteSociety = async (societyId: string, name: string) => {
  if (!window.confirm(`¿Eliminar la sociedad ${name}? Los negocios NO se borran.`)) {
    return
  }

  try {
    await societyStore.deleteSociety(societyId)
    toastStore.success('Sociedad eliminada', 'Solo se eliminó la agrupación, no tus negocios.')
  } catch (error) {
    toastStore.error('No se pudo eliminar la sociedad', error instanceof Error ? error.message : 'Intenta de nuevo.')
  }
}

const getBusinessName = (businessId: string) => {
  const business = businessesStore.businesses.find((currentBusiness) => currentBusiness.id === businessId)
  return business?.name ?? businessId
}
</script>

<template>
  <section class="space-y-6">
    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <p class="text-xs uppercase tracking-[0.35em] text-maize-300">Colaboración</p>
      <h2 class="mt-3 text-3xl font-semibold text-stone-50">Sociedades</h2>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
        Agrupa negocios y comparte su administración con otros usuarios.
      </p>
    </article>

    <article class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-xl font-semibold text-stone-50">Crear sociedad</h3>
        <button
          class="rounded-2xl border border-white/10 px-4 py-2 text-sm text-stone-200 transition hover:border-maize-300 hover:text-maize-200"
          type="button"
          @click="showCreateForm = !showCreateForm"
        >
          {{ showCreateForm ? 'Cancelar' : 'Nueva sociedad' }}
        </button>
      </div>

      <form v-if="showCreateForm" class="mt-5 grid gap-4 md:grid-cols-2" @submit.prevent="submitCreateSociety">
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Nombre</span>
          <input v-model="createForm.name" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" required type="text">
        </label>
        <label class="block space-y-2">
          <span class="text-sm text-stone-200">Descripción</span>
          <input v-model="createForm.description" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-maize-400" type="text">
        </label>
        <button
          class="rounded-2xl bg-leaf-500 px-4 py-3 text-sm font-semibold text-soil-950 transition hover:bg-leaf-400 disabled:opacity-60 md:col-span-2"
          :disabled="societyStore.saving"
          type="submit"
        >
          {{ societyStore.saving ? 'Creando...' : 'Crear sociedad' }}
        </button>
      </form>
    </article>

    <article
      v-for="society in societyStore.ownedSocieties"
      :key="society.id"
      class="surface-card rounded-[2rem] px-6 py-7 sm:px-8"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-leaf-300">Propietario</p>
          <h3 class="mt-2 text-xl font-semibold text-stone-50">{{ society.name }}</h3>
          <p v-if="society.description" class="mt-1 text-sm text-stone-400">{{ society.description }}</p>
        </div>
        <button
          class="rounded-full border border-rose-500/30 px-3 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-400"
          type="button"
          @click="deleteSociety(society.id, society.name)"
        >
          Eliminar
        </button>
      </div>

      <div class="mt-6 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-stone-200">Negocios de la sociedad</p>
          <button
            class="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200 transition hover:border-leaf-400 hover:text-leaf-200"
            type="button"
            @click="openAddBusiness(society.id)"
          >
            + Agregar negocio
          </button>
        </div>

        <div v-if="addingBusinessToSociety === society.id" class="flex gap-2">
          <select
            v-model="selectedBusinessId"
            class="flex-1 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-maize-400"
          >
            <option disabled value="">Selecciona un negocio</option>
            <option v-for="business in availableBusinessesForSociety(society.id)" :key="business.id" :value="business.id">
              {{ business.name }}
            </option>
          </select>
          <button class="rounded-2xl bg-leaf-500 px-4 py-2 text-sm font-semibold text-soil-950" type="button" @click="submitAddBusiness">Agregar</button>
        </div>

        <div v-if="society.businessIds.length" class="space-y-2">
          <div
            v-for="businessId in society.businessIds"
            :key="businessId"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <p class="text-sm text-stone-100">{{ getBusinessName(businessId) }}</p>
            <button class="text-xs text-rose-300 hover:text-rose-100" type="button" @click="removeBusiness(society.id, businessId)">
              Quitar
            </button>
          </div>
        </div>

        <p v-else class="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-center text-sm text-stone-400">
          Esta sociedad aún no tiene negocios.
        </p>
      </div>

      <div class="mt-6 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-stone-200">Miembros con acceso</p>
          <button
            class="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200 transition hover:border-maize-300 hover:text-maize-200"
            type="button"
            @click="openAddMember(society.id)"
          >
            + Agregar miembro
          </button>
        </div>

        <div v-if="addingMemberToSociety === society.id" class="space-y-2">
          <div class="flex gap-2">
            <input
              v-model="memberEmailInput"
              class="flex-1 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-maize-400"
              placeholder="Correo del usuario"
              type="email"
              @keydown.enter.prevent="searchUser"
            >
            <button class="rounded-2xl bg-maize-500 px-4 py-2 text-sm font-semibold text-soil-950" type="button" @click="searchUser">
              {{ searchingUser ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>

          <div v-if="foundUser" class="flex items-center justify-between rounded-2xl border border-leaf-400/30 bg-leaf-400/5 px-4 py-3">
            <div>
              <p class="text-sm font-medium text-stone-100">{{ foundUser.name }}</p>
              <p class="text-xs text-stone-400">{{ foundUser.email }} · {{ foundUser.role }}</p>
            </div>
            <button class="rounded-2xl bg-leaf-500 px-4 py-2 text-sm font-semibold text-soil-950" type="button" @click="submitAddMember">
              Agregar
            </button>
          </div>
        </div>

        <div v-if="society.memberIds.length" class="space-y-2">
          <div
            v-for="memberId in society.memberIds"
            :key="memberId"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <p class="text-xs text-stone-300">{{ memberId }}</p>
            <button class="text-xs text-rose-300 hover:text-rose-100" type="button" @click="removeMember(society.id, memberId)">
              Revocar
            </button>
          </div>
        </div>

        <p v-else class="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-center text-sm text-stone-400">
          Esta sociedad aún no tiene miembros.
        </p>
      </div>
    </article>

    <article v-if="societyStore.memberSocieties.length" class="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
      <p class="text-xs uppercase tracking-[0.3em] text-stone-400">Acceso compartido</p>
      <h3 class="mt-2 text-xl font-semibold text-stone-50">Sociedades donde eres miembro</h3>

      <div class="mt-5 space-y-3">
        <div
          v-for="society in societyStore.memberSocieties"
          :key="society.id"
          class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
        >
          <p class="font-medium text-stone-100">{{ society.name }}</p>
          <p v-if="society.description" class="mt-1 text-sm text-stone-400">{{ society.description }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="businessId in society.businessIds"
              :key="businessId"
              class="rounded-full bg-maize-400/15 px-3 py-1 text-xs text-maize-200"
            >
              {{ getBusinessName(businessId) }}
            </span>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
