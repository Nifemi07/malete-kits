// ---------------------------------------------------------------------------
// Admin authentication — scrypt password hashing + HMAC-SHA256 JWT sessions.
// Deliberately dependency-free (node:crypto) so it works in every runtime.
// Sessions live in an httpOnly cookie; every admin API re-verifies the token.
// ---------------------------------------------------------------------------
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from './db'

const AUTH_SECRET = process.env.AUTH_SECRET || 'malete-dev-secret-change-me'
export const SESSION_COOKIE = 'mk_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 hours

// --- Password hashing (scrypt) ----------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const N = 16384, r = 8, p = 1
  const hash = scryptSync(password, salt, 64, { N, r, p }).toString('hex')
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, Ns, rs, ps, salt, hash] = stored.split('$')
    if (scheme !== 'scrypt') return false
    const derived = scryptSync(password, salt, 64, { N: Number(Ns), r: Number(rs), p: Number(ps) })
    const expected = Buffer.from(hash, 'hex')
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

// --- Minimal JWT (HS256) -----------------------------------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export function signJwt(payload: Record<string, unknown>, ttlSeconds = SESSION_TTL_SECONDS): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }))
  const sig = createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return null
    const expected = createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as { exp?: number } & T
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// --- Session helpers (server-side) -------------------------------------------

export interface AdminSession {
  sub: string // admin id
  email: string
  name: string
  role: string
}

export async function createSessionCookie(admin: AdminSession): Promise<void> {
  const token = signJwt({ sub: admin.sub, email: admin.email, name: admin.name, role: admin.role })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  })
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
}

export async function getSessionAdmin(): Promise<AdminSession | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifyJwt<AdminSession>(token)
  if (!payload || !payload.sub || !payload.email) return null
  // Re-check the admin still exists and is active — revoked admins lose access instantly.
  const admin = await db.adminUser.findUnique({ where: { id: payload.sub } })
  if (!admin || !admin.isActive) return null
  return { sub: admin.id, email: admin.email, name: admin.name, role: admin.role }
}

export class AuthError extends Error {
  status: number
  constructor(message = 'Unauthorized', status = 401) {
    super(message)
    this.status = status
  }
}

/** Guard for admin API routes — throws AuthError when not an active admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getSessionAdmin()
  if (!admin) throw new AuthError('Unauthorized — admin session required', 401)
  return admin
}
