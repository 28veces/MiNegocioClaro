export type UserRole = 'admin' | 'user' | 'partner'

export type EntryType = 'investment' | 'expense' | 'sale' | 'asset' | 'withdrawal'

export type EntryAssignmentMode = 'person' | 'all' | 'unassigned'

export type AuditEntityType = 'person' | 'partner' | 'entry'

export type AuditAction = 'created' | 'updated' | 'deleted' | 'archived' | 'reactivated'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Person {
  id: string
  firstName: string
  lastName: string
  documentNumber: string
  email?: string
  linkedUserId?: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface AuthSession {
  user: AppUser
  accessibleBusinessIds: string[]
}

export interface Business {
  id: string
  name: string
  kind: string
  location: string
  description: string
  currency: string
  createdAt: string
}

export interface Partner {
  id: string
  businessId: string
  personId: string
  userId?: string
  share: number
  contributionFocus: string
  createdAt: string
}

export interface FinancialEntry {
  id: string
  businessId: string
  type: EntryType
  category: string
  amount: number
  note: string
  date: string
  recordedBy: string
  assignmentMode?: EntryAssignmentMode
  assignedPersonId?: string
  assignments?: EntryAssignment[]
  createdAt: string
}

export interface EntryAssignment {
  personId: string
  amount: number
}

export interface AuditEvent {
  id: string
  entityType: AuditEntityType
  entityId: string
  businessId?: string
  actorId?: string
  actorName: string
  action: AuditAction
  title: string
  description: string
  createdAt: string
}

export interface AuditEventQuery {
  entityTypes?: AuditEntityType[]
  businessId?: string
  limit?: number
}

export interface BusinessSummary {
  businessId: string
  totalInvested: number
  totalExpenses: number
  totalSales: number
  totalAssets: number
  netProfit: number
  roi: number | null
  latestEntryAt: string | null
}

export interface PortfolioSummary {
  businessCount: number
  profitableBusinesses: number
  totalInvested: number
  totalExpenses: number
  totalSales: number
  totalAssets: number
  netProfit: number
}

export interface Society {
  id: string
  name: string
  description?: string
  ownerId: string
  memberIds: string[]
  businessIds: string[]
  createdAt: string
}

export interface CreateSocietyInput {
  name: string
  description?: string
  businessIds?: string[]
  memberIds?: string[]
}

export interface UpdateSocietyInput {
  id: string
  name: string
  description?: string
  businessIds: string[]
  memberIds: string[]
}

export interface LoginPayload {
  email: string
  password: string
}

export interface CreateBusinessInput {
  name: string
  kind: string
  location: string
  description: string
  currency?: string
  initialPartners?: CreatePartnerAssociationInput[]
}

export interface CreatePartnerAssociationInput {
  personId: string
  share: number
  contributionFocus: string
}

export interface CreatePersonInput {
  firstName: string
  lastName: string
  documentNumber: string
  email?: string
  linkedUserId?: string
}

export interface UpdatePersonInput {
  id: string
  firstName: string
  lastName: string
  documentNumber: string
  email?: string
  linkedUserId?: string
}

export interface UpdateBusinessInput {
  id: string
  name: string
  kind: string
  location: string
  description: string
  currency?: string
}

export interface CreatePartnerInput {
  businessId: string
  personId: string
  share: number
  contributionFocus: string
}

export interface UpdatePartnerInput {
  id: string
  businessId: string
  personId: string
  share: number
  contributionFocus: string
}

export interface CreateEntryInput {
  businessId: string
  type: EntryType
  category: string
  amount: number
  note: string
  date: string
  recordedBy: string
  assignmentMode?: EntryAssignmentMode
  assignedPersonId?: string
}

export interface UpdateEntryInput {
  id: string
  businessId: string
  type: EntryType
  category: string
  amount: number
  note: string
  date: string
  recordedBy: string
  assignmentMode?: EntryAssignmentMode
  assignedPersonId?: string
}

export const entryTypeOptions: Array<{ label: string; value: EntryType }> = [
  { label: 'Inversión', value: 'investment' },
  { label: 'Gasto', value: 'expense' },
  { label: 'Venta', value: 'sale' },
  { label: 'Activo', value: 'asset' },
  { label: 'Retiro', value: 'withdrawal' }
]

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  user: 'Consulta',
  partner: 'Socio'
}

export const entryTypesWithAssignment: EntryType[] = ['investment', 'expense']

export const entryTypeSupportsAssignment = (entryType: EntryType) => {
  return entryTypesWithAssignment.includes(entryType)
}

export const getPersonFullName = (person: Pick<Person, 'firstName' | 'lastName'>) => {
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim()
}
