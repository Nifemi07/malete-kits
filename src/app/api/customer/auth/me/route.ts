import { db } from '@/lib/db'
import { handleError, ok } from '@/lib/api-helpers'
import { getCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

/** GET /api/customer/auth/me — current customer session (or null). */
export async function GET() {
  try {
    const session = await getCustomerSession()
    if (!session) return ok({ customer: null })

    const account = await db.customerAccount.findUniqueOrThrow({ where: { id: session.sub } })
    return ok({
      customer: {
        email: account.email,
        name: account.name,
        emailVerified: Boolean(account.emailVerifiedAt),
        memberSince: account.createdAt,
        lastLoginAt: account.lastLoginAt,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
