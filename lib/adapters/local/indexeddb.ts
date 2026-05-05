import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import { demoBusinesses, demoEntries, demoPartners, demoPersons, demoUsers } from '~/lib/seed/demo-data'
import { createShortId, createUniqueId } from '~/lib/utils/id'
import type { AuditRepository } from '~/lib/repositories/audit.repository'
import type { AuthRepository } from '~/lib/repositories/auth.repository'
import type { BusinessRepository } from '~/lib/repositories/business.repository'
import type { FinanceRepository } from '~/lib/repositories/finance.repository'
import type { PersonRepository } from '~/lib/repositories/person.repository'
import type { RepositoryBundle } from '~/lib/repositories'
import type {
  AppUser,
  AuditAction,
  AuditEvent,
  AuditEventQuery,
  AuthSession,
  Business,
  CreateBusinessInput,
  CreateEntryInput,
  CreatePersonInput,
  CreatePartnerInput,
  EntryAssignment,
  EntryAssignmentMode,
  FinancialEntry,
  LoginPayload,
  Partner,
  Person,
  UpdateBusinessInput,
  UpdatePartnerInput,
  UpdatePersonInput,
  UpdateEntryInput
} from '~/types/domain'
import { entryTypeSupportsAssignment, getPersonFullName } from '~/types/domain'

interface LocalUserRecord extends AppUser {
  password: string
}

interface SessionRecord {
  id: string
  userId: string
  createdAt: string
}

interface LegacyPartnerRecord {
  id: string
  businessId: string
  userId?: string
  name?: string
  share: number
  contributionFocus: string
  createdAt: string
}

interface TeamVecesSchema extends DBSchema {
  users: {
    key: string
    value: LocalUserRecord
  }
  businesses: {
    key: string
    value: Business
  }
  persons: {
    key: string
    value: Person
    indexes: {
      'by-document': string
      'by-linked-user': string
    }
  }
  partners: {
    key: string
    value: Partner
    indexes: {
      'by-business': string
      'by-user': string
    }
  }
  entries: {
    key: string
    value: FinancialEntry
    indexes: {
      'by-business': string
    }
  }
  auditEvents: {
    key: string
    value: AuditEvent
    indexes: {
      'by-business': string
      'by-entity-type': string
    }
  }
  session: {
    key: string
    value: SessionRecord
  }
}

const DATABASE_NAME = 'teamveces-local'
const DATABASE_VERSION = 3
const SESSION_KEY = 'current-session'

let databasePromise: Promise<IDBPDatabase<TeamVecesSchema>> | null = null
let repositoryBundle: RepositoryBundle | null = null

const sortByNewest = <T extends { createdAt: string }>(items: T[]) => {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

const sortPeople = (items: Person[]) => {
  return [...items].sort((left, right) => {
    return getPersonFullName(left).localeCompare(getPersonFullName(right), 'es', { sensitivity: 'base' })
  })
}

const createId = (prefix: string) => createUniqueId(prefix)

const stripPassword = ({ password: _password, ...user }: LocalUserRecord): AppUser => user

const normalizeValue = (value: string) => value.trim().toLowerCase()

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? 'Persona',
    lastName: parts.slice(1).join(' ') || 'Migrada'
  }
}

const ensureUniqueDocumentNumber = (baseValue: string, usedValues: Set<string>) => {
  let candidate = baseValue
  let suffix = 1

  while (usedValues.has(candidate.toLowerCase())) {
    candidate = `${baseValue}-${suffix}`
    suffix += 1
  }

  usedValues.add(candidate.toLowerCase())
  return candidate
}

const createLegacyDocumentNumber = (label: string, usedValues: Set<string>) => {
  const sanitizedLabel = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)

  const baseValue = `LEG-${sanitizedLabel || createShortId()}`
  return ensureUniqueDocumentNumber(baseValue, usedValues)
}

const ensurePersonsCatalog = async (database: IDBPDatabase<TeamVecesSchema>) => {
  const personCount = await database.count('persons')

  if (personCount > 0) {
    return database
  }

  const users = await database.getAll('users')
  const partners = (await database.getAll('partners')) as unknown as LegacyPartnerRecord[]
  const transaction = database.transaction('persons', 'readwrite')
  const store = transaction.objectStore('persons')
  const usedDocumentNumbers = new Set<string>()
  const knownNames = new Set<string>()

  const createPersonFromLegacyName = async (input: {
    fullName: string
    email?: string
    linkedUserId?: string
    createdAt: string
  }) => {
    const normalizedName = normalizeValue(input.fullName)

    if (!normalizedName || knownNames.has(normalizedName)) {
      return
    }

    knownNames.add(normalizedName)

    const personName = splitFullName(input.fullName)
    const person: Person = {
      id: createId('person'),
      firstName: personName.firstName,
      lastName: personName.lastName,
      documentNumber: createLegacyDocumentNumber(input.fullName, usedDocumentNumbers),
      email: input.email?.trim() || undefined,
      linkedUserId: input.linkedUserId,
      createdAt: input.createdAt,
      updatedAt: input.createdAt
    }

    await store.put(person)
  }

  for (const user of users) {
    await createPersonFromLegacyName({
      fullName: user.name,
      email: user.email,
      linkedUserId: user.id,
      createdAt: new Date().toISOString()
    })
  }

  for (const partner of partners) {
    if (!partner.name) {
      continue
    }

    await createPersonFromLegacyName({
      fullName: partner.name,
      linkedUserId: partner.userId,
      createdAt: partner.createdAt
    })
  }

  await transaction.done
  return database
}

const ensurePartnerPersonLinks = async (database: IDBPDatabase<TeamVecesSchema>) => {
  const partners = (await database.getAll('partners')) as unknown as Array<Partner | LegacyPartnerRecord>

  if (partners.every((partner) => 'personId' in partner && Boolean(partner.personId))) {
    return database
  }

  const persons = await database.getAll('persons')
  const peopleByLinkedUser = new Map(
    persons.filter((person) => person.linkedUserId).map((person) => [person.linkedUserId as string, person])
  )
  const peopleByName = new Map(persons.map((person) => [normalizeValue(getPersonFullName(person)), person]))
  const usedDocumentNumbers = new Set(persons.map((person) => person.documentNumber.toLowerCase()))
  const transaction = database.transaction(['persons', 'partners'], 'readwrite')
  const personStore = transaction.objectStore('persons')
  const partnerStore = transaction.objectStore('partners')

  const createFallbackPerson = async (fullName: string, createdAt: string, linkedUserId?: string) => {
    const personName = splitFullName(fullName)
    const person: Person = {
      id: createId('person'),
      firstName: personName.firstName,
      lastName: personName.lastName,
      documentNumber: createLegacyDocumentNumber(fullName, usedDocumentNumbers),
      linkedUserId,
      createdAt,
      updatedAt: createdAt
    }

    await personStore.put(person)
    peopleByName.set(normalizeValue(getPersonFullName(person)), person)

    if (person.linkedUserId) {
      peopleByLinkedUser.set(person.linkedUserId, person)
    }

    return person
  }

  for (const partner of partners) {
    if ('personId' in partner && partner.personId) {
      continue
    }

    const legacyPartner = partner as LegacyPartnerRecord
    let person = legacyPartner.userId ? peopleByLinkedUser.get(legacyPartner.userId) : undefined

    if (!person && legacyPartner.name) {
      person = peopleByName.get(normalizeValue(legacyPartner.name))
    }

    if (!person && legacyPartner.name) {
      person = await createFallbackPerson(legacyPartner.name, legacyPartner.createdAt, legacyPartner.userId)
    }

    if (!person) {
      throw new Error('No fue posible migrar uno de los socios existentes al catálogo de personas.')
    }

    await partnerStore.put({
      id: legacyPartner.id,
      businessId: legacyPartner.businessId,
      personId: person.id,
      userId: legacyPartner.userId ?? person.linkedUserId,
      share: legacyPartner.share,
      contributionFocus: legacyPartner.contributionFocus,
      createdAt: legacyPartner.createdAt
    })
  }

  await transaction.done
  return database
}

const assertUniqueDocumentNumber = async (
  database: IDBPDatabase<TeamVecesSchema>,
  documentNumber: string,
  currentPersonId?: string
) => {
  const existingPerson = await database.getFromIndex('persons', 'by-document', documentNumber)

  if (existingPerson && existingPerson.id !== currentPersonId) {
    throw new Error('Ya existe una persona registrada con esa cédula.')
  }
}

const ensureSelectablePerson = async (
  database: IDBPDatabase<TeamVecesSchema>,
  personId: string,
  currentPersonId?: string
) => {
  const person = await database.get('persons', personId)

  if (!person) {
    throw new Error('Selecciona una persona válida del catálogo antes de asociarla.')
  }

  if (person.archivedAt && person.id !== currentPersonId) {
    throw new Error('La persona seleccionada está archivada y no admite nuevas asociaciones.')
  }

  return person
}

const normalizePartnerShare = (value: number) => {
  const share = Number(value)

  if (!Number.isFinite(share) || share <= 0) {
    throw new Error('La participación debe ser mayor a cero.')
  }

  if (share > 100) {
    throw new Error('La participación individual no puede superar el 100%.')
  }

  return Number(share.toFixed(2))
}

const getBusinessShareTotal = (partners: Partner[], excludedPartnerId?: string) => {
  return Number(
    partners
      .filter((partner) => partner.id !== excludedPartnerId)
      .reduce((total, partner) => total + partner.share, 0)
      .toFixed(2)
  )
}

const assertBusinessShareCapacity = (partners: Partner[], incomingShare: number, excludedPartnerId?: string) => {
  const occupiedShare = getBusinessShareTotal(partners, excludedPartnerId)
  const projectedShare = Number((occupiedShare + incomingShare).toFixed(2))

  if (projectedShare <= 100) {
    return
  }

  const availableShare = Number(Math.max(0, 100 - occupiedShare).toFixed(2))

  if (availableShare === 0) {
    throw new Error('La suma de participaciones ya completa el 100% de este negocio.')
  }

  throw new Error(
    `La suma de participaciones no puede superar el 100%. Solo quedan ${availableShare}% disponibles en este negocio.`
  )
}

const resolveCurrentActor = async (database: IDBPDatabase<TeamVecesSchema>) => {
  const session = await database.get('session', SESSION_KEY)

  if (!session) {
    return null
  }

  const user = await database.get('users', session.userId)
  return user ? stripPassword(user) : null
}

const formatAuditCurrency = (amount: number, currency = 'COP') => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount)
}

const normalizeEntryAmount = (amount: number) => Number(amount.toFixed(2))

const buildEqualAssignments = (personIds: string[], amount: number): EntryAssignment[] => {
  const normalizedAmount = normalizeEntryAmount(amount)
  const baseAmount = normalizeEntryAmount(normalizedAmount / personIds.length)
  const assignments = personIds.map((personId) => ({ personId, amount: baseAmount }))
  const assignedAmount = normalizeEntryAmount(assignments.reduce((total, assignment) => total + assignment.amount, 0))
  const remainder = normalizeEntryAmount(normalizedAmount - assignedAmount)

  if (remainder !== 0 && assignments.length) {
    const lastAssignment = assignments[assignments.length - 1]
    lastAssignment.amount = normalizeEntryAmount(lastAssignment.amount + remainder)
  }

  return assignments
}

const listBusinessPartnerPeople = async (database: IDBPDatabase<TeamVecesSchema>, businessId: string) => {
  const partners = await database.getAllFromIndex('partners', 'by-business', businessId)
  const personIds = [...new Set(partners.map((partner) => partner.personId).filter(Boolean))]
  const persons = await Promise.all(personIds.map((personId) => database.get('persons', personId)))

  return persons.filter((person): person is Person => Boolean(person))
}

const describeEntryAssignments = async (
  database: IDBPDatabase<TeamVecesSchema>,
  assignmentMode: EntryAssignmentMode,
  assignedPersonId: string | undefined,
  assignments: EntryAssignment[]
) => {
  if (assignmentMode === 'person' && assignedPersonId) {
    const person = await database.get('persons', assignedPersonId)
    return `asignado a ${person ? getPersonFullName(person) : 'un socio del negocio'}`
  }

  if (assignmentMode === 'all') {
    return `repartido entre ${assignments.length} socios del negocio`
  }

  return 'sin asignación específica'
}

const resolveEntryAssignment = async (
  database: IDBPDatabase<TeamVecesSchema>,
  input: Pick<CreateEntryInput, 'businessId' | 'type' | 'amount' | 'assignmentMode' | 'assignedPersonId'>,
  existingEntry?: FinancialEntry
) => {
  if (!entryTypeSupportsAssignment(input.type)) {
    return {
      assignmentMode: 'unassigned' as EntryAssignmentMode,
      assignedPersonId: undefined,
      assignments: [] as EntryAssignment[]
    }
  }

  if (!input.assignmentMode) {
    if (existingEntry && entryTypeSupportsAssignment(existingEntry.type)) {
      return {
        assignmentMode: existingEntry.assignmentMode ?? 'unassigned',
        assignedPersonId: existingEntry.assignedPersonId,
        assignments: [...(existingEntry.assignments ?? [])]
      }
    }

    return {
      assignmentMode: 'unassigned' as EntryAssignmentMode,
      assignedPersonId: undefined,
      assignments: [] as EntryAssignment[]
    }
  }

  if (input.assignmentMode === 'unassigned') {
    return {
      assignmentMode: 'unassigned' as EntryAssignmentMode,
      assignedPersonId: undefined,
      assignments: [] as EntryAssignment[]
    }
  }

  const businessPersons = await listBusinessPartnerPeople(database, input.businessId)

  if (input.assignmentMode === 'person') {
    if (!input.assignedPersonId) {
      throw new Error('Selecciona el socio responsable de este movimiento.')
    }

    const person = businessPersons.find((currentPerson) => currentPerson.id === input.assignedPersonId)

    if (!person) {
      throw new Error('La persona seleccionada no hace parte de los socios actuales de este negocio.')
    }

    return {
      assignmentMode: 'person' as EntryAssignmentMode,
      assignedPersonId: person.id,
      assignments: [{ personId: person.id, amount: normalizeEntryAmount(input.amount) }]
    }
  }

  if (!businessPersons.length) {
    throw new Error('No puedes repartir este movimiento entre todos porque el negocio no tiene socios activos.')
  }

  return {
    assignmentMode: 'all' as EntryAssignmentMode,
    assignedPersonId: undefined,
    assignments: buildEqualAssignments(
      businessPersons.map((person) => person.id),
      input.amount
    )
  }
}

const createAuditEvent = async (
  database: IDBPDatabase<TeamVecesSchema>,
  input: {
    entityType: AuditEvent['entityType']
    entityId: string
    businessId?: string
    action: AuditAction
    title: string
    description: string
  }
) => {
  const actor = await resolveCurrentActor(database)
  const auditEvent: AuditEvent = {
    id: createId('audit'),
    entityType: input.entityType,
    entityId: input.entityId,
    businessId: input.businessId,
    actorId: actor?.id,
    actorName: actor?.name ?? 'Sistema local',
    action: input.action,
    title: input.title,
    description: input.description,
    createdAt: new Date().toISOString()
  }

  await database.put('auditEvents', auditEvent)
  return auditEvent
}

const getDatabase = async () => {
  if (!databasePromise) {
    databasePromise = openDB<TeamVecesSchema>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('users')) {
          database.createObjectStore('users', { keyPath: 'id' })
        }

        if (!database.objectStoreNames.contains('businesses')) {
          database.createObjectStore('businesses', { keyPath: 'id' })
        }

        if (!database.objectStoreNames.contains('persons')) {
          const store = database.createObjectStore('persons', { keyPath: 'id' })
          store.createIndex('by-document', 'documentNumber', { unique: true })
          store.createIndex('by-linked-user', 'linkedUserId')
        }

        if (!database.objectStoreNames.contains('partners')) {
          const store = database.createObjectStore('partners', { keyPath: 'id' })
          store.createIndex('by-business', 'businessId')
          store.createIndex('by-user', 'userId')
        }

        if (!database.objectStoreNames.contains('entries')) {
          const store = database.createObjectStore('entries', { keyPath: 'id' })
          store.createIndex('by-business', 'businessId')
        }

        if (!database.objectStoreNames.contains('auditEvents')) {
          const store = database.createObjectStore('auditEvents', { keyPath: 'id' })
          store.createIndex('by-business', 'businessId')
          store.createIndex('by-entity-type', 'entityType')
        }

        if (!database.objectStoreNames.contains('session')) {
          database.createObjectStore('session', { keyPath: 'id' })
        }
      }
    })
  }

  return databasePromise
}

const resolveAccessibleBusinessIds = async (database: IDBPDatabase<TeamVecesSchema>, user: LocalUserRecord) => {
  if (user.role !== 'partner') {
    const businesses = await database.getAll('businesses')
    return businesses.map((business) => business.id)
  }

  const partnerLinks = await database.getAllFromIndex('partners', 'by-user', user.id)
  return partnerLinks.map((partner) => partner.businessId)
}

const ensureSeedData = async () => {
  const database = await getDatabase()
  const userCount = await database.count('users')

  if (userCount > 0) {
    await ensurePersonsCatalog(database)
    return ensurePartnerPersonLinks(database)
  }

  const transaction = database.transaction(['users', 'businesses', 'persons', 'partners', 'entries'], 'readwrite')

  await Promise.all([
    ...demoUsers.map((user) => transaction.objectStore('users').put(user)),
    ...demoBusinesses.map((business) => transaction.objectStore('businesses').put(business)),
    ...demoPersons.map((person) => transaction.objectStore('persons').put(person)),
    ...demoPartners.map((partner) => transaction.objectStore('partners').put(partner)),
    ...demoEntries.map((entry) => transaction.objectStore('entries').put(entry))
  ])

  await transaction.done
  return ensurePartnerPersonLinks(database)
}

class LocalAuthAdapter implements AuthRepository {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const database = await ensureSeedData()
    const normalizedEmail = payload.email.trim().toLowerCase()
    const users = await database.getAll('users')
    const user = users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail)

    if (!user || user.password !== payload.password) {
      throw new Error('Credenciales inválidas. Usa una de las cuentas demo.')
    }

    const accessibleBusinessIds = await resolveAccessibleBusinessIds(database, user)

    await database.put('session', {
      id: SESSION_KEY,
      userId: user.id,
      createdAt: new Date().toISOString()
    })

    return {
      user: stripPassword(user),
      accessibleBusinessIds
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const database = await ensureSeedData()
    const session = await database.get('session', SESSION_KEY)

    if (!session) {
      return null
    }

    const user = await database.get('users', session.userId)

    if (!user) {
      await database.delete('session', SESSION_KEY)
      return null
    }

    return {
      user: stripPassword(user),
      accessibleBusinessIds: await resolveAccessibleBusinessIds(database, user)
    }
  }

  async logout(): Promise<void> {
    const database = await ensureSeedData()
    await database.delete('session', SESSION_KEY)
  }
}

class LocalBusinessAdapter implements BusinessRepository {
  async listBusinesses(session: AuthSession): Promise<Business[]> {
    const database = await ensureSeedData()
    const businesses = await database.getAll('businesses')

    if (session.user.role === 'partner') {
      return sortByNewest(
        businesses.filter((business) => session.accessibleBusinessIds.includes(business.id))
      )
    }

    return sortByNewest(businesses)
  }

  async getBusinessById(id: string): Promise<Business | null> {
    const database = await ensureSeedData()
    return (await database.get('businesses', id)) ?? null
  }

  async createBusiness(input: CreateBusinessInput): Promise<Business> {
    const database = await ensureSeedData()
    const business: Business = {
      id: createId('business'),
      name: input.name,
      kind: input.kind,
      location: input.location,
      description: input.description,
      currency: input.currency ?? 'COP',
      createdAt: new Date().toISOString()
    }

    await database.put('businesses', business)
    return business
  }

  async updateBusiness(input: UpdateBusinessInput): Promise<Business> {
    const database = await ensureSeedData()
    const existingBusiness = await database.get('businesses', input.id)

    if (!existingBusiness) {
      throw new Error('No se encontró el negocio solicitado.')
    }

    const business: Business = {
      ...existingBusiness,
      name: input.name,
      kind: input.kind,
      location: input.location,
      description: input.description,
      currency: input.currency ?? existingBusiness.currency
    }

    await database.put('businesses', business)
    return business
  }

  async deleteBusiness(id: string): Promise<void> {
    const database = await ensureSeedData()
    const existingBusiness = await database.get('businesses', id)

    if (!existingBusiness) {
      throw new Error('No se encontró el negocio solicitado.')
    }

    const relatedPartners = await database.getAllFromIndex('partners', 'by-business', id)
    const relatedEntries = await database.getAllFromIndex('entries', 'by-business', id)
    const transaction = database.transaction(['businesses', 'partners', 'entries'], 'readwrite')

    await Promise.all([
      transaction.objectStore('businesses').delete(id),
      ...relatedPartners.map((partner) => transaction.objectStore('partners').delete(partner.id)),
      ...relatedEntries.map((entry) => transaction.objectStore('entries').delete(entry.id))
    ])

    await transaction.done
  }

  async listPartners(businessId: string): Promise<Partner[]> {
    const database = await ensureSeedData()
    const partners = await database.getAllFromIndex('partners', 'by-business', businessId)
    return sortByNewest(partners)
  }

  async createPartner(input: CreatePartnerInput): Promise<Partner> {
    const database = await ensureSeedData()
    const person = await ensureSelectablePerson(database, input.personId)
    const business = await database.get('businesses', input.businessId)

    const businessPartners = await database.getAllFromIndex('partners', 'by-business', input.businessId)
    const share = normalizePartnerShare(input.share)

    if (businessPartners.some((partner) => partner.personId === input.personId)) {
      throw new Error('Esta persona ya está asociada a este negocio.')
    }

    assertBusinessShareCapacity(businessPartners, share)

    const partner: Partner = {
      id: createId('partner'),
      businessId: input.businessId,
      personId: input.personId,
      userId: person.linkedUserId,
      share,
      contributionFocus: input.contributionFocus,
      createdAt: new Date().toISOString()
    }

    await database.put('partners', partner)
    await createAuditEvent(database, {
      entityType: 'partner',
      entityId: partner.id,
      businessId: partner.businessId,
      action: 'created',
      title: 'Socio asociado',
      description: `${getPersonFullName(person)} quedó asociado a ${business?.name ?? 'este negocio'} con ${share}% de participación.`
    })
    return partner
  }

  async updatePartner(input: UpdatePartnerInput): Promise<Partner> {
    const database = await ensureSeedData()
    const existingPartner = await database.get('partners', input.id)

    if (!existingPartner) {
      throw new Error('No se encontró la asociación del socio solicitada.')
    }

    const person = await ensureSelectablePerson(database, input.personId, existingPartner.personId)
    const previousPerson = await database.get('persons', existingPartner.personId)
    const business = await database.get('businesses', input.businessId)
    const businessPartners = await database.getAllFromIndex('partners', 'by-business', input.businessId)
    const share = normalizePartnerShare(input.share)

    if (businessPartners.some((partner) => partner.personId === input.personId && partner.id !== input.id)) {
      throw new Error('Esta persona ya está asociada a este negocio.')
    }

    assertBusinessShareCapacity(businessPartners, share, input.id)

    const partner: Partner = {
      ...existingPartner,
      businessId: input.businessId,
      personId: input.personId,
      userId: person.linkedUserId,
      share,
      contributionFocus: input.contributionFocus
    }

    await database.put('partners', partner)
    await createAuditEvent(database, {
      entityType: 'partner',
      entityId: partner.id,
      businessId: partner.businessId,
      action: 'updated',
      title: 'Asociación actualizada',
      description:
        previousPerson && previousPerson.id !== person.id
          ? `La asociación en ${business?.name ?? 'este negocio'} cambió de ${getPersonFullName(previousPerson)} a ${getPersonFullName(person)} y quedó en ${share}% de participación.`
          : `${getPersonFullName(person)} actualizó su participación en ${business?.name ?? 'este negocio'} a ${share}%.`
    })
    return partner
  }

  async deletePartner(id: string): Promise<void> {
    const database = await ensureSeedData()
    const existingPartner = await database.get('partners', id)

    if (!existingPartner) {
      throw new Error('No se encontró la asociación del socio solicitada.')
    }

    const person = await database.get('persons', existingPartner.personId)
    const business = await database.get('businesses', existingPartner.businessId)
    await database.delete('partners', id)
    await createAuditEvent(database, {
      entityType: 'partner',
      entityId: existingPartner.id,
      businessId: existingPartner.businessId,
      action: 'deleted',
      title: 'Socio removido',
      description: `${person ? getPersonFullName(person) : 'La persona asociada'} fue retirada de ${business?.name ?? 'este negocio'}.`
    })
  }
}

class LocalPersonAdapter implements PersonRepository {
  async listPersons(session: AuthSession): Promise<Person[]> {
    const database = await ensureSeedData()
    const persons = await database.getAll('persons')

    if (session.user.role === 'partner') {
      const partnerGroups = await Promise.all(
        session.accessibleBusinessIds.map((businessId) => database.getAllFromIndex('partners', 'by-business', businessId))
      )

      const visiblePersonIds = new Set(
        partnerGroups.flat().map((partner) => partner.personId).filter(Boolean)
      )

      return sortPeople(
        persons.filter((person) => {
          return visiblePersonIds.has(person.id) || person.linkedUserId === session.user.id
        })
      )
    }

    return sortPeople(persons)
  }

  async getPersonById(id: string): Promise<Person | null> {
    const database = await ensureSeedData()
    return (await database.get('persons', id)) ?? null
  }

  async createPerson(input: CreatePersonInput): Promise<Person> {
    const database = await ensureSeedData()
    const now = new Date().toISOString()
    const documentNumber = input.documentNumber.trim()
    const email = input.email?.trim() || undefined

    if (!documentNumber) {
      throw new Error('La cédula es obligatoria para registrar una persona.')
    }

    if (email && !isValidEmail(email)) {
      throw new Error('Ingresa un correo válido o deja el campo vacío.')
    }

    await assertUniqueDocumentNumber(database, documentNumber)

    const person: Person = {
      id: createId('person'),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      documentNumber,
      email,
      linkedUserId: input.linkedUserId,
      createdAt: now,
      updatedAt: now
    }

    await database.put('persons', person)
    await createAuditEvent(database, {
      entityType: 'person',
      entityId: person.id,
      action: 'created',
      title: 'Persona registrada',
      description: `${getPersonFullName(person)} fue registrada con cédula ${person.documentNumber}.`
    })
    return person
  }

  async updatePerson(input: UpdatePersonInput): Promise<Person> {
    const database = await ensureSeedData()
    const existingPerson = await database.get('persons', input.id)
    const email = input.email?.trim() || undefined

    if (!existingPerson) {
      throw new Error('No se encontró la persona solicitada.')
    }

    const documentNumber = input.documentNumber.trim()

    if (!documentNumber) {
      throw new Error('La cédula es obligatoria para registrar una persona.')
    }

    if (email && !isValidEmail(email)) {
      throw new Error('Ingresa un correo válido o deja el campo vacío.')
    }

    await assertUniqueDocumentNumber(database, documentNumber, input.id)

    const person: Person = {
      ...existingPerson,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      documentNumber,
      email,
      linkedUserId: input.linkedUserId,
      updatedAt: new Date().toISOString()
    }

    await database.put('persons', person)
    await createAuditEvent(database, {
      entityType: 'person',
      entityId: person.id,
      action: 'updated',
      title: 'Persona actualizada',
      description: `${getPersonFullName(person)} actualizó sus datos del catálogo.`
    })
    return person
  }

  async setPersonArchived(id: string, archived: boolean): Promise<Person> {
    const database = await ensureSeedData()
    const existingPerson = await database.get('persons', id)

    if (!existingPerson) {
      throw new Error('No se encontró la persona solicitada.')
    }

    const now = new Date().toISOString()
    const person: Person = {
      ...existingPerson,
      archivedAt: archived ? existingPerson.archivedAt ?? now : undefined,
      updatedAt: now
    }

    await database.put('persons', person)
    await createAuditEvent(database, {
      entityType: 'person',
      entityId: person.id,
      action: archived ? 'archived' : 'reactivated',
      title: archived ? 'Persona archivada' : 'Persona reactivada',
      description: archived
        ? `${getPersonFullName(person)} dejó de estar disponible para nuevas asociaciones.`
        : `${getPersonFullName(person)} volvió a estar disponible para asociarla a negocios.`
    })
    return person
  }
}

class LocalFinanceAdapter implements FinanceRepository {
  async listEntries(businessId: string): Promise<FinancialEntry[]> {
    const database = await ensureSeedData()
    const entries = await database.getAllFromIndex('entries', 'by-business', businessId)
    return sortByNewest(entries)
  }

  async createEntry(input: CreateEntryInput): Promise<FinancialEntry> {
    const database = await ensureSeedData()
    const business = await database.get('businesses', input.businessId)

    if (input.amount <= 0) {
      throw new Error('El monto debe ser mayor a cero.')
    }

    const assignment = await resolveEntryAssignment(database, input)
    const assignmentDescription = await describeEntryAssignments(
      database,
      assignment.assignmentMode,
      assignment.assignedPersonId,
      assignment.assignments
    )

    const entry: FinancialEntry = {
      id: createId('entry'),
      businessId: input.businessId,
      type: input.type,
      category: input.category,
      amount: input.amount,
      note: input.note,
      date: input.date,
      recordedBy: input.recordedBy,
      assignmentMode: assignment.assignmentMode,
      assignedPersonId: assignment.assignedPersonId,
      assignments: assignment.assignments,
      createdAt: new Date().toISOString()
    }

    await database.put('entries', entry)
    await createAuditEvent(database, {
      entityType: 'entry',
      entityId: entry.id,
      businessId: entry.businessId,
      action: 'created',
      title: 'Movimiento registrado',
      description: `${entry.category} por ${formatAuditCurrency(entry.amount, business?.currency)} fue registrado en ${business?.name ?? 'este negocio'}, ${assignmentDescription}.`
    })
    return entry
  }

  async updateEntry(input: UpdateEntryInput): Promise<FinancialEntry> {
    const database = await ensureSeedData()
    const existingEntry = await database.get('entries', input.id)

    if (!existingEntry) {
      throw new Error('No se encontró el movimiento solicitado.')
    }

    const business = await database.get('businesses', input.businessId)

    if (input.amount <= 0) {
      throw new Error('El monto debe ser mayor a cero.')
    }

    const assignment = await resolveEntryAssignment(database, input, existingEntry)
    const assignmentDescription = await describeEntryAssignments(
      database,
      assignment.assignmentMode,
      assignment.assignedPersonId,
      assignment.assignments
    )

    const entry: FinancialEntry = {
      ...existingEntry,
      type: input.type,
      category: input.category,
      amount: input.amount,
      note: input.note,
      date: input.date,
      recordedBy: input.recordedBy,
      assignmentMode: assignment.assignmentMode,
      assignedPersonId: assignment.assignedPersonId,
      assignments: assignment.assignments
    }

    await database.put('entries', entry)
    await createAuditEvent(database, {
      entityType: 'entry',
      entityId: entry.id,
      businessId: entry.businessId,
      action: 'updated',
      title: 'Movimiento actualizado',
      description: `${entry.category} quedó actualizado en ${business?.name ?? 'este negocio'} por ${formatAuditCurrency(entry.amount, business?.currency)}, ${assignmentDescription}.`
    })
    return entry
  }

  async deleteEntry(id: string): Promise<void> {
    const database = await ensureSeedData()
    const existingEntry = await database.get('entries', id)

    if (!existingEntry) {
      throw new Error('No se encontró el movimiento solicitado.')
    }

    const business = await database.get('businesses', existingEntry.businessId)
    await database.delete('entries', id)
    await createAuditEvent(database, {
      entityType: 'entry',
      entityId: existingEntry.id,
      businessId: existingEntry.businessId,
      action: 'deleted',
      title: 'Movimiento eliminado',
      description: `${existingEntry.category} fue eliminado del historial de ${business?.name ?? 'este negocio'}.`
    })
  }
}

class LocalAuditAdapter implements AuditRepository {
  async listEvents(query: AuditEventQuery = {}): Promise<AuditEvent[]> {
    const database = await ensureSeedData()
    const entityTypes = query.entityTypes ?? []
    let events: AuditEvent[]

    if (query.businessId) {
      events = await database.getAllFromIndex('auditEvents', 'by-business', query.businessId)
    } else if (entityTypes.length === 1) {
      events = await database.getAllFromIndex('auditEvents', 'by-entity-type', entityTypes[0])
    } else {
      events = await database.getAll('auditEvents')
    }

    if (entityTypes.length) {
      events = events.filter((event) => entityTypes.includes(event.entityType))
    }

    const sortedEvents = sortByNewest(events)
    return query.limit ? sortedEvents.slice(0, query.limit) : sortedEvents
  }
}

export const createLocalRepositories = (): RepositoryBundle => {
  repositoryBundle ??= {
    audit: new LocalAuditAdapter(),
    auth: new LocalAuthAdapter(),
    businesses: new LocalBusinessAdapter(),
    finance: new LocalFinanceAdapter(),
    persons: new LocalPersonAdapter()
  }

  return repositoryBundle
}