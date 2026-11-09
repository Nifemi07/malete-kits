import { handleError, ok } from '@/lib/api-helpers'
import { destroyCustomerSessionCookie } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

/** POST /api/customer/auth/logout — clears the customer session cookie. */
export async function POST() {
  await destroyCustomerSessionCookie()
  return ok({ loggedOut: true })
}
