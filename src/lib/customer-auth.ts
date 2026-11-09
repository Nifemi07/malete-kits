// ---------------------------------------------------------------------------
// Customer authentication — email + 6-digit verification codes (passwordless).
//
// The email code IS the verification: an account is only usable after a code
// was proven to arrive at that inbox. Codes are hashed with the same scrypt
// scheme as admin passwords, expire after 10 minutes, allow at most 5 wrong
// attempts, and are single-use. A successful code grants a separate httpOnly
// cookie (mk_customer_session, 30 days) that can NEVER open admin routes —
// admin sessions live in mk_admin_session and resolve through AdminUser only.
// ---------------------------------------------------------------------------
import { randomInt } from 'crypto'
import { cookies } from 'next/headers'
import { db } from './db'
import { AuthError, hashPassword, signJwt, verifyJwt, verifyPassword } from './auth'

export const CUSTOMER_SESSION_COOKIE = 'mk_customer_session'
const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
export const CODE_TTL_MINUTES = 10
export const CODE_MAX_ATTEMPTS = 5

export interface CustomerSession {
  sub: string
  email: string
  name: string
  typ: 'customer'
}

export async function createCustomerSessionCookie(account: { id: string; email: string; name: string | null }): Promise<void> {
  const token = signJwt(
    { sub: account.id, email: account.email, name: account.name ?? '', typ: 'customer' },
    CUSTOMER_SESSION_TTL_SECONDS,
  )
  const store = await cookies()
  store.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CUSTOMER_SESSION_TTL_SECONDS,
    path: '/',
  })
}

export async function destroyCustomerSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(CUSTOMER_SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies()
  const token = store.get(CUSTOMER_SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifyJwt<{ sub?: string; email?: string; name?: string; typ?: string }>(token)
  // typ is mandatory — an admin token (or any forged token without typ) can never
  // satisfy a customer route.
  if (!payload || payload.typ !== 'customer' || !payload.sub) return null
  // Re-check the account still exists and is active — disabled accounts lose access instantly.
  const account = await db.customerAccount.findUnique({ where: { id: payload.sub } })
  if (!account || !account.isActive) return null
  return { sub: account.id, email: account.email, name: account.name ?? '', typ: 'customer' }
}

/** Guard for customer API routes — throws AuthError when not signed in. */
export async function requireCustomer(): Promise<CustomerSession> {
  const session = await getCustomerSession()
  if (!session) throw new AuthError('Please sign in to continue', 401)
  return session
}

// --- Verification codes --------------------------------------------------------

export function generateLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashCode(code: string): string {
  return hashPassword(code)
}

export function verifyCodeHash(code: string, stored: string): boolean {
  return verifyPassword(code, stored)
}
