import { defineStore } from 'pinia'
import { useRepositories } from '~/lib/repositories'
import type { AppUser, CreateSocietyInput, Society } from '~/types/domain'

export const useSocietyStore = defineStore('society', {
  state: () => ({
    societies: [] as Society[],
    ready: false,
    saving: false
  }),
  getters: {
    ownedSocieties: (state) => {
      const authStore = useAuthStore()
      return state.societies.filter((society) => society.ownerId === authStore.user?.id)
    },
    memberSocieties: (state) => {
      const authStore = useAuthStore()
      return state.societies.filter((society) => society.ownerId !== authStore.user?.id)
    }
  },
  actions: {
    resetState() {
      this.$reset()
    },
    async hydrate(force = false) {
      if (this.ready && !force) {
        return
      }

      const authStore = useAuthStore()
      if (!authStore.user) {
        return
      }

      this.societies = await useRepositories().society.listSocieties(authStore.user.id)
      this.ready = true
    },
    async createSociety(input: CreateSocietyInput) {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('Debes iniciar sesión para crear una sociedad.')
      }

      this.saving = true

      try {
        const society = await useRepositories().society.createSociety(input, authStore.user.id)
        this.societies = [society, ...this.societies]
        return society
      } finally {
        this.saving = false
      }
    },
    async addBusiness(societyId: string, businessId: string) {
      const society = this.societies.find((currentSociety) => currentSociety.id === societyId)

      if (!society) {
        throw new Error('No se encontró la sociedad seleccionada.')
      }

      if (society.businessIds.includes(businessId)) {
        return
      }

      this.saving = true

      try {
        const updatedSociety = await useRepositories().society.updateSociety({
          id: society.id,
          name: society.name,
          description: society.description,
          memberIds: society.memberIds,
          businessIds: [...society.businessIds, businessId]
        })

        this.societies = this.societies.map((currentSociety) => {
          return currentSociety.id === societyId ? updatedSociety : currentSociety
        })
      } finally {
        this.saving = false
      }
    },
    async removeBusiness(societyId: string, businessId: string) {
      const society = this.societies.find((currentSociety) => currentSociety.id === societyId)

      if (!society) {
        throw new Error('No se encontró la sociedad seleccionada.')
      }

      this.saving = true

      try {
        const updatedSociety = await useRepositories().society.updateSociety({
          id: society.id,
          name: society.name,
          description: society.description,
          memberIds: society.memberIds,
          businessIds: society.businessIds.filter((currentBusinessId) => currentBusinessId !== businessId)
        })

        this.societies = this.societies.map((currentSociety) => {
          return currentSociety.id === societyId ? updatedSociety : currentSociety
        })
      } finally {
        this.saving = false
      }
    },
    async addMember(societyId: string, user: AppUser) {
      const society = this.societies.find((currentSociety) => currentSociety.id === societyId)

      if (!society) {
        throw new Error('No se encontró la sociedad seleccionada.')
      }

      if (society.memberIds.includes(user.id)) {
        throw new Error('El usuario ya pertenece a esta sociedad.')
      }

      this.saving = true

      try {
        const updatedSociety = await useRepositories().society.updateSociety({
          id: society.id,
          name: society.name,
          description: society.description,
          memberIds: [...society.memberIds, user.id],
          businessIds: society.businessIds
        })

        this.societies = this.societies.map((currentSociety) => {
          return currentSociety.id === societyId ? updatedSociety : currentSociety
        })
      } finally {
        this.saving = false
      }
    },
    async removeMember(societyId: string, userId: string) {
      const society = this.societies.find((currentSociety) => currentSociety.id === societyId)

      if (!society) {
        throw new Error('No se encontró la sociedad seleccionada.')
      }

      this.saving = true

      try {
        const updatedSociety = await useRepositories().society.updateSociety({
          id: society.id,
          name: society.name,
          description: society.description,
          memberIds: society.memberIds.filter((currentUserId) => currentUserId !== userId),
          businessIds: society.businessIds
        })

        this.societies = this.societies.map((currentSociety) => {
          return currentSociety.id === societyId ? updatedSociety : currentSociety
        })
      } finally {
        this.saving = false
      }
    },
    async deleteSociety(societyId: string) {
      this.saving = true

      try {
        await useRepositories().society.deleteSociety(societyId)
        this.societies = this.societies.filter((society) => society.id !== societyId)
      } finally {
        this.saving = false
      }
    },
    async findUserByEmail(email: string) {
      return useRepositories().society.findUserByEmail(email)
    }
  }
})
