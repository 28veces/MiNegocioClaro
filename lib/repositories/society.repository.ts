import type { AppUser, CreateSocietyInput, Society, UpdateSocietyInput } from '~/types/domain'

export interface SocietyRepository {
  listSocieties(userId: string): Promise<Society[]>
  getSocietyById(id: string): Promise<Society | null>
  createSociety(input: CreateSocietyInput, ownerId: string): Promise<Society>
  updateSociety(input: UpdateSocietyInput): Promise<Society>
  deleteSociety(id: string): Promise<void>
  findUserByEmail(email: string): Promise<AppUser | null>
}
