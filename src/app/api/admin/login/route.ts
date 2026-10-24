import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { loginSchema } from '@/lib/validation'
import { verifyPassword, createSessionCookie, destroySessionCookie } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { handleError, ok, fail } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/** POST /api/admin/login — issues an httpOnly session cookie on success. */
export async function POST(req: NextRequest) {
  try {
    // Brute-force protection
    const rl = rateLimit(`login:${clientIp(req)}`, 5, 15 * 60_000)
    if (!rl.ok) {
      return fail(`Too many login attempts. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).`, 429)
    }

    const body = await req.json().catch(() => null)
    if (!body) return fail('Invalid request body', 400)
    const { email, password } = loginSchema.parse(body)

    const admin = await db.adminUser.findUnique({ where: { email } })
    // Uniform error — do not reveal whether the account exists.
    if (!admin || !admin.isActive || !verifyPassword(password, admin.passwordHash)) {
      return fail('Invalid email or password', 401)
    }

    await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
    await createSessionCookie({ sub: admin.id, email: admin.email, name: admin.name, role: admin.role })
    return ok({ admin: { email: admin.email, name: admin.name, role: admin.role } })
  } catch (err) {
    return handleError(err)
  }
}

/** DELETE /api/admin/login — logout. */
export async function DELETE() {
  await destroySessionCookie()
  return ok({ loggedOut: true })
}
