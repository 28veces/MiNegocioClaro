import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'

// Firestore document types (extend domain types with Firestore metadata)
export interface FirestoreAppUser extends DocumentData {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'partner'
  createdAt: string
  updatedAt: string
}

export interface FirestorePerson extends DocumentData {
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

export interface FirestoreBusiness extends DocumentData {
  id: string
  name: string
  kind: string
  location: string
  description: string
  currency: string
  createdAt: string
}

export interface FirestorePartner extends DocumentData {
  id: string
  businessId: string
  personId: string
  userId?: string
  share: number
  contributionFocus: string
  createdAt: string
}

export interface FirestoreFinancialEntry extends DocumentData {
  id: string
  businessId: string
  type: 'investment' | 'expense' | 'sale' | 'asset' | 'withdrawal'
  category: string
  amount: number
  note: string
  date: string
  recordedBy: string
  assignmentMode?: 'person' | 'all' | 'unassigned'
  assignedPersonId?: string
  assignments?: Array<{
    personId: string
    amount: number
  }>
  createdAt: string
}

export interface FirestoreAuditEvent extends DocumentData {
  id: string
  entityType: 'person' | 'partner' | 'entry'
  entityId: string
  businessId?: string
  actorId?: string
  actorName: string
  action: 'created' | 'updated' | 'deleted' | 'archived' | 'reactivated'
  title: string
  description: string
  createdAt: string
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  PERSONS: 'persons',
  BUSINESSES: 'businesses',
  PARTNERS: 'partners',
  ENTRIES: 'entries',
  AUDIT_EVENTS: 'auditEvents'
} as const

// Type guards for Firestore documents
export function isValidAppUser(data: any): data is FirestoreAppUser {
  return (
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.email === 'string' &&
    ['admin', 'user', 'partner'].includes(data.role) &&
    typeof data.createdAt === 'string'
  )
}

export function isValidPerson(data: any): data is FirestorePerson {
  return (
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.firstName === 'string' &&
    typeof data.lastName === 'string' &&
    typeof data.documentNumber === 'string' &&
    typeof data.createdAt === 'string'
  )
}

export function isValidBusiness(data: any): data is FirestoreBusiness {
  return (
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.kind === 'string' &&
    typeof data.location === 'string' &&
    typeof data.description === 'string' &&
    typeof data.currency === 'string' &&
    typeof data.createdAt === 'string'
  )
}

export function isValidPartner(data: any): data is FirestorePartner {
  return (
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.businessId === 'string' &&
    typeof data.personId === 'string' &&
    typeof data.share === 'number' &&
    typeof data.contributionFocus === 'string' &&
    typeof data.createdAt === 'string'
  )
}

export function isValidFinancialEntry(data: any): data is FirestoreFinancialEntry {
  return (
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.businessId === 'string' &&
    ['investment', 'expense', 'sale', 'asset', 'withdrawal'].includes(data.type) &&
    typeof data.category === 'string' &&
    typeof data.amount === 'number' &&
    typeof data.note === 'string' &&
    typeof data.date === 'string' &&
    typeof data.recordedBy === 'string' &&
    typeof data.createdAt === 'string'
  )
}

export function isValidAuditEvent(data: any): data is FirestoreAuditEvent {
  return (
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    ['person', 'partner', 'entry'].includes(data.entityType) &&
    typeof data.entityId === 'string' &&
    typeof data.actorName === 'string' &&
    ['created', 'updated', 'deleted', 'archived', 'reactivated'].includes(data.action) &&
    typeof data.title === 'string' &&
    typeof data.description === 'string' &&
    typeof data.createdAt === 'string'
  )
}