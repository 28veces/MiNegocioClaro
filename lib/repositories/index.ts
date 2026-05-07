import { createFirebaseRepositories } from '~/lib/adapters/firebase/client'
import { createLocalRepositories } from '~/lib/adapters/local/indexeddb'
import type { AuditRepository } from '~/lib/repositories/audit.repository'
import type { AuthRepository } from '~/lib/repositories/auth.repository'
import type { BusinessRepository } from '~/lib/repositories/business.repository'
import type { FinanceRepository } from '~/lib/repositories/finance.repository'
import type { PersonRepository } from '~/lib/repositories/person.repository'

export interface RepositoryBundle {
  audit: AuditRepository
  auth: AuthRepository
  businesses: BusinessRepository
  finance: FinanceRepository
  persons: PersonRepository
}

export const useRepositories = (): RepositoryBundle => {
  const runtimeConfig = useRuntimeConfig()

  if (runtimeConfig.public.dataMode === 'firebase') {
    // Validate Firebase configuration is available
    if (!runtimeConfig.public.firebaseProjectId) {
      throw new Error('Firebase configuration missing. Please check your environment variables.')
    }
    return createFirebaseRepositories()
  }

  return createLocalRepositories()
}