import type { AuthSession, LoginPayload } from '~/types/domain'

export interface AuthRepository {
  login(payload: LoginPayload): Promise<AuthSession>
  getSession(): Promise<AuthSession | null>
  logout(): Promise<void>
}