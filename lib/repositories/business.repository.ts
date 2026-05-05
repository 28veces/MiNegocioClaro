import type { AuthSession, Business, CreateBusinessInput, CreatePartnerInput, Partner, UpdateBusinessInput, UpdatePartnerInput } from '~/types/domain'

export interface BusinessRepository {
  listBusinesses(session: AuthSession): Promise<Business[]>
  getBusinessById(id: string): Promise<Business | null>
  createBusiness(input: CreateBusinessInput): Promise<Business>
  updateBusiness(input: UpdateBusinessInput): Promise<Business>
  deleteBusiness(id: string): Promise<void>
  listPartners(businessId: string): Promise<Partner[]>
  createPartner(input: CreatePartnerInput): Promise<Partner>
  updatePartner(input: UpdatePartnerInput): Promise<Partner>
  deletePartner(id: string): Promise<void>
}