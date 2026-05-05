import { defineStore } from 'pinia'
import { useRepositories } from '~/lib/repositories'
import { useAuthStore } from '~/stores/auth'
import { buildBusinessSummary } from '~/composables/useBusinessSummary'
import type { Business, BusinessSummary, CreateBusinessInput, CreateEntryInput, CreatePartnerInput, FinancialEntry, Partner, UpdateBusinessInput, UpdateEntryInput, UpdatePartnerInput } from '~/types/domain'

export const useBusinessesStore = defineStore('businesses', {
  state: () => ({
    businesses: [] as Business[],
    entriesByBusiness: {} as Record<string, FinancialEntry[]>,
    activeBusinessId: null as string | null,
    activeBusiness: null as Business | null,
    activeEntries: [] as FinancialEntry[],
    activePartners: [] as Partner[],
    activeSummary: null as BusinessSummary | null,
    saving: false
  }),
  getters: {
    businessMap: (state) => {
      return state.businesses.reduce((map, business) => {
        map[business.id] = business
        return map
      }, {} as Record<string, Business>)
    }
  },
  actions: {
    resetState() {
      this.businesses = []
      this.entriesByBusiness = {}
      this.activeBusinessId = null
      this.activeBusiness = null
      this.activeEntries = []
      this.activePartners = []
      this.activeSummary = null
    },

    async hydrateOverview(force = false) {
      const authStore = useAuthStore()
      await authStore.initialize()

      if (!authStore.isAuthenticated) {
        this.resetState()
        return
      }

      if (this.businesses.length && !force) {
        return
      }

      const repo = useRepositories()
      this.businesses = await repo.businesses.listBusinesses({
        user: authStore.user!,
        accessibleBusinessIds: authStore.accessibleBusinessIds
      })
      this.entriesByBusiness = {}

      await Promise.all(
        this.businesses.map(async (business) => {
          this.entriesByBusiness[business.id] = await repo.finance.listEntries(business.id)
        })
      )
    },

    async openBusiness(businessId: string) {
      const authStore = useAuthStore()
      await authStore.initialize()

      const repo = useRepositories()
      const business = this.businessMap[businessId] ?? (await repo.businesses.getBusinessById(businessId))

      if (!business) {
        throw new Error('No se encontró el negocio solicitado.')
      }

      this.activeBusinessId = businessId
      this.activeBusiness = business
      this.activeEntries = await repo.finance.listEntries(businessId)
      this.activePartners = await repo.businesses.listPartners(businessId)
      this.activeSummary = buildBusinessSummary(businessId, this.activeEntries)
      this.entriesByBusiness[businessId] = this.activeEntries
    },

    async createBusiness(input: CreateBusinessInput) {
      this.saving = true
      try {
        const business = await useRepositories().businesses.createBusiness(input)
        this.businesses.unshift(business)
        return business
      } finally {
        this.saving = false
      }
    },

    async updateBusiness(input: UpdateBusinessInput) {
      this.saving = true
      try {
        const business = await useRepositories().businesses.updateBusiness(input)
        const index = this.businesses.findIndex((item) => item.id === business.id)
        if (index >= 0) {
          this.businesses.splice(index, 1, business)
        }

        if (this.activeBusinessId === business.id) {
          this.activeBusiness = business
        }

        return business
      } finally {
        this.saving = false
      }
    },

    async deleteBusiness(businessId: string) {
      await useRepositories().businesses.deleteBusiness(businessId)
      this.businesses = this.businesses.filter((business) => business.id !== businessId)
      delete this.entriesByBusiness[businessId]

      if (this.activeBusinessId === businessId) {
        this.activeBusinessId = null
        this.activeBusiness = null
        this.activeEntries = []
        this.activePartners = []
        this.activeSummary = null
      }
    },

    async addPartner(input: CreatePartnerInput) {
      this.saving = true
      try {
        const partner = await useRepositories().businesses.createPartner(input)

        if (this.activeBusinessId === input.businessId) {
          this.activePartners.unshift(partner)
        }

        return partner
      } finally {
        this.saving = false
      }
    },

    async updatePartner(input: UpdatePartnerInput) {
      this.saving = true
      try {
        const partner = await useRepositories().businesses.updatePartner(input)

        if (this.activeBusinessId === input.businessId) {
          const index = this.activePartners.findIndex((item) => item.id === partner.id)
          if (index >= 0) {
            this.activePartners.splice(index, 1, partner)
          }
        }

        return partner
      } finally {
        this.saving = false
      }
    },

    async deletePartner(businessId: string, partnerId: string) {
      this.saving = true
      try {
        await useRepositories().businesses.deletePartner(partnerId)

        if (this.activeBusinessId === businessId) {
          this.activePartners = this.activePartners.filter((partner) => partner.id !== partnerId)
        }
      } finally {
        this.saving = false
      }
    },

    async addEntry(input: CreateEntryInput) {
      this.saving = true
      try {
        const entry = await useRepositories().finance.createEntry(input)

        if (!this.entriesByBusiness[input.businessId]) {
          this.entriesByBusiness[input.businessId] = []
        }

        this.entriesByBusiness[input.businessId].unshift(entry)

        if (this.activeBusinessId === input.businessId) {
          this.activeEntries.unshift(entry)
          this.activeSummary = buildBusinessSummary(input.businessId, this.activeEntries)
        }

        return entry
      } finally {
        this.saving = false
      }
    },

    async updateEntry(input: UpdateEntryInput) {
      this.saving = true
      try {
        const entry = await useRepositories().finance.updateEntry(input)

        const entries = this.entriesByBusiness[input.businessId] ?? []
        const index = entries.findIndex((item) => item.id === entry.id)
        if (index >= 0) {
          entries.splice(index, 1, entry)
        }
        this.entriesByBusiness[input.businessId] = entries

        if (this.activeBusinessId === input.businessId) {
          const activeIndex = this.activeEntries.findIndex((item) => item.id === entry.id)
          if (activeIndex >= 0) {
            this.activeEntries.splice(activeIndex, 1, entry)
          }
          this.activeSummary = buildBusinessSummary(input.businessId, this.activeEntries)
        }

        return entry
      } finally {
        this.saving = false
      }
    },

    async deleteEntry(businessId: string, entryId: string) {
      this.saving = true
      try {
        await useRepositories().finance.deleteEntry(entryId)

        if (this.entriesByBusiness[businessId]) {
          this.entriesByBusiness[businessId] = this.entriesByBusiness[businessId].filter((entry) => entry.id !== entryId)
        }

        if (this.activeBusinessId === businessId) {
          this.activeEntries = this.activeEntries.filter((entry) => entry.id !== entryId)
          this.activeSummary = buildBusinessSummary(businessId, this.activeEntries)
        }
      } finally {
        this.saving = false
      }
    }
  }
})