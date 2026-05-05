import type { CreateEntryInput, FinancialEntry, UpdateEntryInput } from '~/types/domain'

export interface FinanceRepository {
  listEntries(businessId: string): Promise<FinancialEntry[]>
  createEntry(input: CreateEntryInput): Promise<FinancialEntry>
  updateEntry(input: UpdateEntryInput): Promise<FinancialEntry>
  deleteEntry(id: string): Promise<void>
}