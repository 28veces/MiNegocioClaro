import type { RepositoryBundle } from '~/lib/repositories'

export const createFirebaseRepositories = (): RepositoryBundle => {
  throw new Error('El adapter Firebase todavia no esta implementado. Usa NUXT_PUBLIC_DATA_MODE=local para este MVP.')
}