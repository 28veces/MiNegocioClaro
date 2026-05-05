import { defineStore } from 'pinia'
import { useRepositories } from '~/lib/repositories'
import { useAuthStore } from '~/stores/auth'
import type { CreatePersonInput, Person, UpdatePersonInput } from '~/types/domain'

export const usePersonsStore = defineStore('persons', {
  state: () => ({
    persons: [] as Person[],
    saving: false
  }),
  getters: {
    activePersons: (state) => state.persons.filter((person) => !person.archivedAt),
    personMap: (state) => {
      return state.persons.reduce((map, person) => {
        map[person.id] = person
        return map
      }, {} as Record<string, Person>)
    }
  },
  actions: {
    async hydrate(force = false) {
      const authStore = useAuthStore()
      await authStore.initialize()

      if (!authStore.isAuthenticated) {
        this.persons = []
        return
      }

      if (this.persons.length && !force) {
        return
      }

      this.persons = await useRepositories().persons.listPersons({
        user: authStore.user!,
        accessibleBusinessIds: authStore.accessibleBusinessIds
      })
    },

    async createPerson(input: CreatePersonInput) {
      this.saving = true
      try {
        const person = await useRepositories().persons.createPerson(input)
        this.persons.unshift(person)
        return person
      } finally {
        this.saving = false
      }
    },

    async updatePerson(input: UpdatePersonInput) {
      this.saving = true
      try {
        const person = await useRepositories().persons.updatePerson(input)
        const index = this.persons.findIndex((item) => item.id === person.id)
        if (index >= 0) {
          this.persons.splice(index, 1, person)
        }
        return person
      } finally {
        this.saving = false
      }
    },

    async setArchived(id: string, archived: boolean) {
      this.saving = true
      try {
        const person = await useRepositories().persons.setPersonArchived(id, archived)
        const index = this.persons.findIndex((item) => item.id === person.id)
        if (index >= 0) {
          this.persons.splice(index, 1, person)
        }
        return person
      } finally {
        this.saving = false
      }
    }
  }
})