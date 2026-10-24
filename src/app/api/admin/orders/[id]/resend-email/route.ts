import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { handleError, fail } from '@/lib/api-helpers'
import { retryNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/** POST /api/admin/orders/[id]/resend-email — convenience alias for the retry UI. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const result = await resendConfirmationEmail(id)
    if (!result.ok) return fail(result.error ?? 'Email resend failed', 502)
    return Response.json({ resent: true })
  } catch (err) {
    return handleError(err)
  }
}
