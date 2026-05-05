import type { AuthSession, CreatePersonInput, Person, UpdatePersonInput } from '~/types/domain'

export interface PersonRepository {
  listPersons(session: AuthSession): Promise<Person[]>
  getPersonById(id: string): Promise<Person | null>
  createPerson(input: CreatePersonInput): Promise<Person>
  updatePerson(input: UpdatePersonInput): Promise<Person>
  setPersonArchived(id: string, archived: boolean): Promise<Person>
}