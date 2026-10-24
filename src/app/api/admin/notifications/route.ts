import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok, fail } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { retryNotification } from '@/lib/notifications'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const retrySchema = z.object({ logId: z.string().min(1) })

/** GET /api/admin/notifications — notification delivery log (retryable). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sp = req.nextUrl.searchParams
    const status = sp.get('status')
    const where: Record<string, unknown> = {}
    if (status && ['PENDING', 'SENT', 'FAILED'].includes(status)) where.status = status

    const logs = await db.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        order: { select: { orderNumber: true, customerName: true, customerPhone: true, customerEmail: true } },
      },
    })
    return ok({ logs })
  } catch (err) {
    return handleError(err)
  }
}

/** POST /api/admin/notifications — retry a failed notification by log id. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json().catch(() => null)
    const { logId } = retrySchema.parse(body)
    const result = await retryNotification(logId)
    if (!result.ok) return fail(result.error ?? 'Notification retry failed', 502)
    return ok({ retried: true })
  } catch (err) {
    return handleError(err)
  }
}
