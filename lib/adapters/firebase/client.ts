import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type DocumentData
} from 'firebase/firestore'
import type { RepositoryBundle } from '~/lib/repositories'
import type {
  AuthSession,
  LoginPayload,
  Business,
  CreateBusinessInput,
  UpdateBusinessInput,
  Partner,
  CreatePartnerInput,
  UpdatePartnerInput,
  Person,
  CreatePersonInput,
  UpdatePersonInput,
  FinancialEntry,
  CreateEntryInput,
  UpdateEntryInput,
  AuditEvent,
  AuditEventQuery,
  AppUser,
  UserRole
} from '~/types/domain'
import { initializeFirebase } from './config'

// Helper functions
const convertTimestamp = (timestamp: Timestamp | Date | string): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString()
  }
  return timestamp
}

const createTimestamp = (): Timestamp => {
  return Timestamp.now()
}

// Auth Repository Implementation
class FirebaseAuthRepository {
  async login(payload: LoginPayload): Promise<AuthSession> {
    try {
      const userCredential = await signInWithEmailAndPassword(getAuth(), payload.email, payload.password)
      const user = userCredential.user

      // Get user data from Firestore
      const userDoc = await getDoc(doc(getDb(), 'users', user.uid))
      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado en la base de datos')
      }

      const userData = userDoc.data()
      const appUser: AppUser = {
        id: user.uid,
        name: userData.name || user.displayName || user.email || 'Usuario',
        email: userData.email || user.email || '',
        role: userData.role || 'user'
      }

      // Get accessible business IDs (businesses where user is owner or partner)
      const accessibleBusinessIds = await this.getAccessibleBusinessIds(user.uid)

      return {
        user: appUser,
        accessibleBusinessIds
      }
    } catch (error: any) {
      throw new Error(`Error al iniciar sesión: ${error.message}`)
    }
  }

  async getSession(): Promise<AuthSession | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
        unsubscribe()
        if (!user) {
          resolve(null)
          return
        }

        try {
          const userDoc = await getDoc(doc(getDb(), 'users', user.uid))
          if (!userDoc.exists()) {
            resolve(null)
            return
          }

          const userData = userDoc.data()
          const appUser: AppUser = {
            id: user.uid,
            name: userData.name || user.displayName || user.email || 'Usuario',
            email: userData.email || user.email || '',
            role: userData.role || 'user'
          }

          const accessibleBusinessIds = await this.getAccessibleBusinessIds(user.uid)

          resolve({
            user: appUser,
            accessibleBusinessIds
          })
        } catch (error) {
          resolve(null)
        }
      })
    })
  }

  async logout(): Promise<void> {
    try {
      await signOut(getAuth())
    } catch (error: any) {
      throw new Error(`Error al cerrar sesión: ${error.message}`)
    }
  }

  private async getAccessibleBusinessIds(userId: string): Promise<string[]> {
    try {
      const businessIds: string[] = []

      // Get businesses where user is owner
      const ownedBusinessesQuery = query(
        collection(getDb(), 'businesses'),
        where('createdBy', '==', userId)
      )
      const ownedBusinessesSnapshot = await getDocs(ownedBusinessesQuery)
      ownedBusinessesSnapshot.forEach((doc) => {
        businessIds.push(doc.id)
      })

      // Get businesses where user is partner
      const partnerQuery = query(
        collection(getDb(), 'partners'),
        where('userId', '==', userId)
      )
      const partnerSnapshot = await getDocs(partnerQuery)
      partnerSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.businessId && !businessIds.includes(data.businessId)) {
          businessIds.push(data.businessId)
        }
      })

      return businessIds
    } catch (error) {
      console.error('Error getting accessible business IDs:', error)
      return []
    }
  }
}

// Business Repository Implementation
class FirebaseBusinessRepository {
  async listBusinesses(session: AuthSession): Promise<Business[]> {
    try {
      const businesses: Business[] = []

      // Get businesses where user is owner
      const ownedBusinessesQuery = query(
        collection(getDb(), 'businesses'),
        where('createdBy', '==', session.user.id)
      )
      const ownedBusinessesSnapshot = await getDocs(ownedBusinessesQuery)
      ownedBusinessesSnapshot.forEach((doc) => {
        const data = doc.data()
        businesses.push({
          id: doc.id,
          name: data.name,
          kind: data.kind,
          location: data.location,
          description: data.description,
          currency: data.currency || 'USD',
          createdAt: convertTimestamp(data.createdAt)
        })
      })

      // Get businesses where user is partner
      const partnerQuery = query(
        collection(getDb(), 'partners'),
        where('userId', '==', session.user.id)
      )
      const partnerSnapshot = await getDocs(partnerQuery)
      for (const partnerDoc of partnerSnapshot.docs) {
        const partnerData = partnerDoc.data()
        if (partnerData.businessId && !businesses.find(b => b.id === partnerData.businessId)) {
          const businessDoc = await getDoc(doc(getDb(), 'businesses', partnerData.businessId))
          if (businessDoc.exists()) {
            const data = businessDoc.data()
            businesses.push({
              id: businessDoc.id,
              name: data.name,
              kind: data.kind,
              location: data.location,
              description: data.description,
              currency: data.currency || 'USD',
              createdAt: convertTimestamp(data.createdAt)
            })
          }
        }
      }

      return businesses
    } catch (error: any) {
      throw new Error(`Error al listar negocios: ${error.message}`)
    }
  }

  async getBusinessById(id: string): Promise<Business | null> {
    try {
      const docRef = doc(getDb(), 'businesses', id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        kind: data.kind,
        location: data.location,
        description: data.description,
        currency: data.currency || 'USD',
        createdAt: convertTimestamp(data.createdAt)
      }
    } catch (error: any) {
      throw new Error(`Error al obtener negocio: ${error.message}`)
    }
  }

  async createBusiness(input: CreateBusinessInput): Promise<Business> {
    try {
      const user = getAuth().currentUser
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const businessData = {
        name: input.name,
        kind: input.kind,
        location: input.location,
        description: input.description,
        currency: input.currency || 'USD',
        createdBy: user.uid,
        createdAt: createTimestamp()
      }

      const docRef = await addDoc(collection(getDb(), 'businesses'), businessData)

      // Create initial partners if provided
      if (input.initialPartners && input.initialPartners.length > 0) {
        for (const partnerInput of input.initialPartners) {
          await this.createPartner({
            businessId: docRef.id,
            personId: partnerInput.personId,
            share: partnerInput.share,
            contributionFocus: partnerInput.contributionFocus
          })
        }
      }

      return {
        id: docRef.id,
        name: input.name,
        kind: input.kind,
        location: input.location,
        description: input.description,
        currency: input.currency || 'USD',
        createdAt: new Date().toISOString()
      }
    } catch (error: any) {
      throw new Error(`Error al crear negocio: ${error.message}`)
    }
  }

  async updateBusiness(input: UpdateBusinessInput): Promise<Business> {
    try {
      const docRef = doc(getDb(), 'businesses', input.id)
      const updateData = {
        name: input.name,
        kind: input.kind,
        location: input.location,
        description: input.description,
        currency: input.currency || 'USD'
      }

      await updateDoc(docRef, updateData)

      return {
        id: input.id,
        name: input.name,
        kind: input.kind,
        location: input.location,
        description: input.description,
        currency: input.currency || 'USD',
        createdAt: '' // Will be fetched if needed
      }
    } catch (error: any) {
      throw new Error(`Error al actualizar negocio: ${error.message}`)
    }
  }

  async deleteBusiness(id: string): Promise<void> {
    try {
      await deleteDoc(doc(getDb(), 'businesses', id))
    } catch (error: any) {
      throw new Error(`Error al eliminar negocio: ${error.message}`)
    }
  }

  async listPartners(businessId: string): Promise<Partner[]> {
    try {
      const partnersQuery = query(
        collection(getDb(), 'partners'),
        where('businessId', '==', businessId)
      )
      const querySnapshot = await getDocs(partnersQuery)

      const partners: Partner[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        partners.push({
          id: doc.id,
          businessId: data.businessId,
          personId: data.personId,
          userId: data.userId,
          share: data.share,
          contributionFocus: data.contributionFocus,
          createdAt: convertTimestamp(data.createdAt)
        })
      })

      return partners
    } catch (error: any) {
      throw new Error(`Error al listar socios: ${error.message}`)
    }
  }

  async createPartner(input: CreatePartnerInput): Promise<Partner> {
    try {
      const partnerData = {
        businessId: input.businessId,
        personId: input.personId,
        share: input.share,
        contributionFocus: input.contributionFocus,
        createdAt: createTimestamp()
      }

      const docRef = await addDoc(collection(getDb(), 'partners'), partnerData)

      return {
        id: docRef.id,
        businessId: input.businessId,
        personId: input.personId,
        share: input.share,
        contributionFocus: input.contributionFocus,
        createdAt: new Date().toISOString()
      }
    } catch (error: any) {
      throw new Error(`Error al crear socio: ${error.message}`)
    }
  }

  async updatePartner(input: UpdatePartnerInput): Promise<Partner> {
    try {
      const docRef = doc(getDb(), 'partners', input.id)
      const updateData = {
        businessId: input.businessId,
        personId: input.personId,
        share: input.share,
        contributionFocus: input.contributionFocus
      }

      await updateDoc(docRef, updateData)

      return {
        id: input.id,
        businessId: input.businessId,
        personId: input.personId,
        share: input.share,
        contributionFocus: input.contributionFocus,
        createdAt: '' // Will be fetched if needed
      }
    } catch (error: any) {
      throw new Error(`Error al actualizar socio: ${error.message}`)
    }
  }

  async deletePartner(id: string): Promise<void> {
    try {
      await deleteDoc(doc(getDb(), 'partners', id))
    } catch (error: any) {
      throw new Error(`Error al eliminar socio: ${error.message}`)
    }
  }
}

// Person Repository Implementation
class FirebasePersonRepository {
  async listPersons(session: AuthSession): Promise<Person[]> {
    try {
      const querySnapshot = await getDocs(collection(getDb(), 'persons'))
      const persons: Person[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        persons.push({
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          documentNumber: data.documentNumber,
          email: data.email,
          linkedUserId: data.linkedUserId,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          archivedAt: data.archivedAt ? convertTimestamp(data.archivedAt) : undefined
        })
      })

      return persons
    } catch (error: any) {
      throw new Error(`Error al listar personas: ${error.message}`)
    }
  }

  async getPersonById(id: string): Promise<Person | null> {
    try {
      const docRef = doc(getDb(), 'persons', id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const data = docSnap.data()
      return {
        id: docSnap.id,
        firstName: data.firstName,
        lastName: data.lastName,
        documentNumber: data.documentNumber,
        email: data.email,
        linkedUserId: data.linkedUserId,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        archivedAt: data.archivedAt ? convertTimestamp(data.archivedAt) : undefined
      }
    } catch (error: any) {
      throw new Error(`Error al obtener persona: ${error.message}`)
    }
  }

  async createPerson(input: CreatePersonInput): Promise<Person> {
    try {
      const personData: any = {
        firstName: input.firstName,
        lastName: input.lastName,
        documentNumber: input.documentNumber,
        createdAt: createTimestamp(),
        updatedAt: createTimestamp()
      }

      // Only include optional fields if they have values
      if (input.email) {
        personData.email = input.email
      }
      if (input.linkedUserId) {
        personData.linkedUserId = input.linkedUserId
      }

      const docRef = await addDoc(collection(getDb(), 'persons'), personData)

      return {
        id: docRef.id,
        firstName: input.firstName,
        lastName: input.lastName,
        documentNumber: input.documentNumber,
        email: input.email,
        linkedUserId: input.linkedUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error: any) {
      throw new Error(`Error al crear persona: ${error.message}`)
    }
  }

  async updatePerson(input: UpdatePersonInput): Promise<Person> {
    try {
      const docRef = doc(getDb(), 'persons', input.id)
      const updateData: any = {
        firstName: input.firstName,
        lastName: input.lastName,
        documentNumber: input.documentNumber,
        updatedAt: createTimestamp()
      }

      // Only include optional fields if they have values
      if (input.email) {
        updateData.email = input.email
      }
      if (input.linkedUserId) {
        updateData.linkedUserId = input.linkedUserId
      }

      await updateDoc(docRef, updateData)

      return {
        id: input.id,
        firstName: input.firstName,
        lastName: input.lastName,
        documentNumber: input.documentNumber,
        email: input.email,
        linkedUserId: input.linkedUserId,
        createdAt: '', // Will be fetched if needed
        updatedAt: new Date().toISOString()
      }
    } catch (error: any) {
      throw new Error(`Error al actualizar persona: ${error.message}`)
    }
  }

  async setPersonArchived(id: string, archived: boolean): Promise<Person> {
    try {
      const docRef = doc(getDb(), 'persons', id)
      const updateData = {
        archivedAt: archived ? createTimestamp() : null,
        updatedAt: createTimestamp()
      }

      await updateDoc(docRef, updateData)

      // Return updated person
      const updatedDoc = await getDoc(docRef)
      const data = updatedDoc.data()!
      return {
        id: updatedDoc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        documentNumber: data.documentNumber,
        email: data.email,
        linkedUserId: data.linkedUserId,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        archivedAt: data.archivedAt ? convertTimestamp(data.archivedAt) : undefined
      }
    } catch (error: any) {
      throw new Error(`Error al archivar persona: ${error.message}`)
    }
  }
}

// Finance Repository Implementation
class FirebaseFinanceRepository {
  async listEntries(businessId: string): Promise<FinancialEntry[]> {
    try {
      const entriesQuery = query(
        collection(getDb(), 'entries'),
        where('businessId', '==', businessId),
        orderBy('date', 'desc')
      )
      const querySnapshot = await getDocs(entriesQuery)

      const entries: FinancialEntry[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        entries.push({
          id: doc.id,
          businessId: data.businessId,
          type: data.type,
          category: data.category,
          amount: data.amount,
          note: data.note,
          date: data.date,
          recordedBy: data.recordedBy,
          assignmentMode: data.assignmentMode,
          assignedPersonId: data.assignedPersonId,
          assignments: data.assignments,
          createdAt: convertTimestamp(data.createdAt)
        })
      })

      return entries
    } catch (error: any) {
      throw new Error(`Error al listar entradas: ${error.message}`)
    }
  }

  async createEntry(input: CreateEntryInput): Promise<FinancialEntry> {
    try {
      const entryData = {
        businessId: input.businessId,
        type: input.type,
        category: input.category,
        amount: input.amount,
        note: input.note,
        date: input.date,
        recordedBy: input.recordedBy,
        assignmentMode: input.assignmentMode,
        assignedPersonId: input.assignedPersonId,
        assignments: [],
        createdAt: createTimestamp()
      }

      const docRef = await addDoc(collection(getDb(), 'entries'), entryData)

      return {
        id: docRef.id,
        businessId: input.businessId,
        type: input.type,
        category: input.category,
        amount: input.amount,
        note: input.note,
        date: input.date,
        recordedBy: input.recordedBy,
        assignmentMode: input.assignmentMode,
        assignedPersonId: input.assignedPersonId,
        assignments: [],
        createdAt: new Date().toISOString()
      }
    } catch (error: any) {
      throw new Error(`Error al crear entrada: ${error.message}`)
    }
  }

  async updateEntry(input: UpdateEntryInput): Promise<FinancialEntry> {
    try {
      const docRef = doc(getDb(), 'entries', input.id)
      const updateData = {
        businessId: input.businessId,
        type: input.type,
        category: input.category,
        amount: input.amount,
        note: input.note,
        date: input.date,
        recordedBy: input.recordedBy,
        assignmentMode: input.assignmentMode,
        assignedPersonId: input.assignedPersonId
      }

      await updateDoc(docRef, updateData)

      return {
        id: input.id,
        businessId: input.businessId,
        type: input.type,
        category: input.category,
        amount: input.amount,
        note: input.note,
        date: input.date,
        recordedBy: input.recordedBy,
        assignmentMode: input.assignmentMode,
        assignedPersonId: input.assignedPersonId,
        assignments: [], // Will be fetched if needed
        createdAt: '' // Will be fetched if needed
      }
    } catch (error: any) {
      throw new Error(`Error al actualizar entrada: ${error.message}`)
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      await deleteDoc(doc(getDb(), 'entries', id))
    } catch (error: any) {
      throw new Error(`Error al eliminar entrada: ${error.message}`)
    }
  }
}

// Audit Repository Implementation
class FirebaseAuditRepository {
  async listEvents(queryParams?: AuditEventQuery): Promise<AuditEvent[]> {
    try {
      let firestoreCollection = collection(getDb(), 'auditEvents')
      let firestoreQuery: any = firestoreCollection

      if (queryParams?.businessId) {
        firestoreQuery = query(firestoreCollection, where('businessId', '==', queryParams.businessId))
      }

      if (queryParams?.entityTypes && queryParams.entityTypes.length > 0) {
        firestoreQuery = query(firestoreQuery, where('entityType', 'in', queryParams.entityTypes))
      }

      let finalQuery = query(firestoreQuery, orderBy('createdAt', 'desc'))

      if (queryParams?.limit) {
        finalQuery = query(finalQuery, limit(queryParams.limit))
      }

      const querySnapshot = await getDocs(finalQuery)

      const events: AuditEvent[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as DocumentData
        events.push({
          id: doc.id,
          entityType: data.entityType,
          entityId: data.entityId,
          businessId: data.businessId,
          actorId: data.actorId,
          actorName: data.actorName,
          action: data.action,
          title: data.title,
          description: data.description,
          createdAt: convertTimestamp(data.createdAt)
        })
      })

      return events
    } catch (error: any) {
      throw new Error(`Error al listar eventos de auditoría: ${error.message}`)
    }
  }
}

// Global references updated when Firebase initializes
let _globalAuth: any = null
let _globalDb: any = null

export const createFirebaseRepositories = (): RepositoryBundle => {
  // Initialize Firebase on first use
  const { auth: initAuth, db: initDb } = initializeFirebase()
  
  // Update global references so classes can use them
  _globalAuth = initAuth
  _globalDb = initDb

  return {
    auth: new FirebaseAuthRepository(),
    businesses: new FirebaseBusinessRepository(),
    persons: new FirebasePersonRepository(),
    finance: new FirebaseFinanceRepository(),
    audit: new FirebaseAuditRepository()
  }
}

// Replace all references to auth and db with _globalAuth and _globalDb
const getAuth = () => _globalAuth
const getDb = () => _globalDb