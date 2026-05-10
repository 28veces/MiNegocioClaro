import { defineStore } from 'pinia'
import { useRepositories } from '~/lib/repositories'
import type { AppUser, AuthSession, LoginPayload } from '~/types/domain'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AppUser | null,
    accessibleBusinessIds: [] as string[],
    pending: false,
    error: ''
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    roleLabel: (state) => {
      if (!state.user) {
        return 'Invitado'
      }

      switch (state.user.role) {
        case 'admin':
          return 'Administrador'
        case 'partner':
          return 'Socio'
        default:
          return 'Usuario'
      }
    },
    canCreateBusiness: (state): boolean => state.user?.role === 'admin',
    canManagePeople: (state): boolean => state.user?.role === 'admin',
    canManageBusinessSettings: (state): boolean => state.user?.role === 'admin',
    canManageBusiness: (state): (businessId: string) => boolean => {
      return (businessId: string) => {
        if (!state.user) {
          return false
        }

        return state.user.role === 'admin' || state.accessibleBusinessIds.includes(businessId)
      }
    },
    canReadBusiness: (state): (businessId: string) => boolean => {
      return (businessId: string) => {
        if (!state.user) {
          return false
        }

        return state.user.role === 'admin' || state.accessibleBusinessIds.includes(businessId)
      }
    }
  },
  actions: {
    async initialize() {
      try {
        const session = await useRepositories().auth.getSession()

        if (!session) {
          this.user = null
          this.accessibleBusinessIds = []
          return null
        }

        this.user = session.user
        this.accessibleBusinessIds = session.accessibleBusinessIds
        return session
      } catch (error) {
        // Log error but don't fail silently - just reset state
        console.debug('Auth session error:', error instanceof Error ? error.message : 'Unknown error')
        this.user = null
        this.accessibleBusinessIds = []
        return null
      }
    },

    async login(payload: LoginPayload) {
      this.pending = true
      this.error = ''

      try {
        const session = await useRepositories().auth.login(payload)
        this.user = session.user
        this.accessibleBusinessIds = session.accessibleBusinessIds
        return session
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Error al iniciar sesión.'
        throw error
      } finally {
        this.pending = false
      }
    },

    async logout() {
      try {
        await useRepositories().auth.logout()
      } finally {
        this.user = null
        this.accessibleBusinessIds = []
      }
    }
  }
})