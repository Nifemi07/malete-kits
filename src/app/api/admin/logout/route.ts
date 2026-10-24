import { destroySessionCookie } from '@/lib/auth'
import { ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/** POST /api/admin/logout — clears the session cookie. */
export async function POST() {
  await destroySessionCookie()
  return ok({ loggedOut: true })
}
