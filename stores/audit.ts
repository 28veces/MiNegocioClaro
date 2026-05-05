import { defineStore } from 'pinia'
import { useRepositories } from '~/lib/repositories'
import type { AuditEvent } from '~/types/domain'

export const useAuditStore = defineStore('audit', {
  state: () => ({
    personEvents: [] as AuditEvent[],
    entryEvents: {} as Record<string, AuditEvent[]>,
    partnerEvents: {} as Record<string, AuditEvent[]>
  }),
  getters: {
    entryEvents: (state) => (businessId: string) => state.entryEvents[businessId] ?? [],
    partnerEvents: (state) => (businessId: string) => state.partnerEvents[businessId] ?? []
  },
  actions: {
    async hydratePersonEvents() {
      this.personEvents = await useRepositories().audit.listEvents({ entityTypes: ['person'] })
    },

    async hydrateEntryEvents(businessId: string) {
      this.entryEvents[businessId] = await useRepositories().audit.listEvents({
        businessId,
        entityTypes: ['entry']
      })
    },

    async hydratePartnerEvents(businessId: string) {
      this.partnerEvents[businessId] = await useRepositories().audit.listEvents({
        businessId,
        entityTypes: ['partner']
      })
    }
  }
})