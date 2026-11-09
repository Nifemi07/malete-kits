import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { customerVerifyCodeSchema } from '@/lib/validation'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { handleError, ok, fail } from '@/lib/api-helpers'
import {
  createCustomerSessionCookie,
  verifyCodeHash,
  CODE_MAX_ATTEMPTS,
} from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/customer/auth/verify — passwordless sign-in, step 2.
 * Checks the newest unconsumed, unexpired code for the account (constant-time
 * scrypt compare, max 5 wrong attempts), consumes it exactly once, marks the
 * email verified and issues the customer session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return fail('Invalid request body', 400)
    const { email, code } = customerVerifyCodeSchema.parse(body)

    const rl = rateLimit(`cust-verify:${email}:${clientIp(req)}`, 8, 15 * 60_000)
    if (!rl.ok) {
      return fail('Too many attempts — please wait a few minutes and try again.', 429)
    }

    const account = await db.customerAccount.findUnique({ where: { email } })
    // Uniform error — do not reveal whether the account exists.
    if (!account || !account.isActive) {
      return fail('That code is not valid or has expired — request a new one.', 401)
    }

    const record = await db.customerLoginCode.findFirst({
      where: { accountId: account.id, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!record) {
      return fail('That code has expired — request a new one.', 410)
    }
    if (record.attempts >= CODE_MAX_ATTEMPTS) {
      return fail('Too many wrong attempts for this code — request a new one.', 429)
    }

    if (!verifyCodeHash(code, record.codeHash)) {
      await db.customerLoginCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      })
      return fail('That code is not correct — check the email and try again.', 401)
    }

    // Single-use: consume atomically so two concurrent verifies can't both win.
    const consumed = await db.customerLoginCode.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    })
    if (consumed.count === 0) {
      return fail('That code was already used — request a new one.', 409)
    }

    await db.customerAccount.update({
      where: { id: account.id },
      data: {
        lastLoginAt: new Date(),
        emailVerifiedAt: account.emailVerifiedAt ?? new Date(),
      },
    })

    await createCustomerSessionCookie(account)
    return ok({ customer: { email: account.email, name: account.name } })
  } catch (err) {
    return handleError(err)
  }
}
