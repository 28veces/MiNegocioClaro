import type { AuditEvent, AuditEventQuery } from '~/types/domain'

export interface AuditRepository {
  listEvents(query?: AuditEventQuery): Promise<AuditEvent[]>
}