import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { customerRequestCodeSchema } from '@/lib/validation'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { handleError, ok, fail } from '@/lib/api-helpers'
import { generateLoginCode, hashCode, CODE_TTL_MINUTES } from '@/lib/customer-auth'
import { dispatchLoginCodeEmail } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/customer/auth/request-code — passwordless sign-in, step 1.
 * Creates the account on first use (so any email can sign in), issues a
 * 6-digit code (hashed at rest, 10-minute TTL) and emails it. The response
 * never leaks whether the email existed — accounts are created on demand.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return fail('Invalid request body', 400)
    const { email } = customerRequestCodeSchema.parse(body)

    // Brute-force / code-spam protection: per-email AND per-IP budgets.
    const perEmail = rateLimit(`cust-code:${email}`, 3, 15 * 60_000)
    const perIp = rateLimit(`cust-code-ip:${clientIp(req)}`, 12, 15 * 60_000)
    if (!perEmail.ok || !perIp.ok) {
      return fail('Too many code requests — please wait a few minutes and try again.', 429)
    }

    const existing = await db.customerAccount.findUnique({ where: { email } })
    if (existing && !existing.isActive) {
      return fail('This account has been disabled. Please contact the store.', 403)
    }

    // Prefill a display name from the latest order placed with this email.
    let name = existing?.name ?? null
    if (!name) {
      const lastOrder = await db.order.findFirst({
        where: { customerEmail: email },
        orderBy: { createdAt: 'desc' },
        select: { customerName: true },
      })
      name = lastOrder?.customerName ?? null
    }

    const account = await db.customerAccount.upsert({
      where: { email },
      update: name ? { name } : {},
      create: { email, name },
    })

    // One live code at a time — a fresh request invalidates the previous one.
    await db.customerLoginCode.deleteMany({ where: { accountId: account.id, consumedAt: null } })
    const code = generateLoginCode()
    await db.customerLoginCode.create({
      data: {
        accountId: account.id,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
      },
    })

    const { delivered } = await dispatchLoginCodeEmail(account.email, account.name, code)

    // Local testing aid ONLY: when no email provider is configured there is no
    // other way to see the code. Never runs in production or once an email
    // provider is configured.
    if (!delivered && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] Sign-in code for ${account.email}: ${code}`)
    }

    return ok({
      ok: true,
      emailDelivered: delivered,
      expiresInSeconds: CODE_TTL_MINUTES * 60,
      message: `We sent a 6-digit code to ${email}. It expires in ${CODE_TTL_MINUTES} minutes.`,
    })
  } catch (err) {
    return handleError(err)
  }
}
