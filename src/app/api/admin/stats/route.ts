import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { AWAITING_PAYMENT_ORDER_STATUSES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/** GET /api/admin/stats — dashboard counters (server-side authorized). */
export async function GET() {
  try {
    await requireAdmin()

    const [total, awaitingConfirmation, confirmed, processing, readyForPickup, outForDelivery, completed, cancelled, paid, paymentPending, refunded, unpaid] =
      await Promise.all([
        db.order.count(),
        db.order.count({ where: { status: 'AWAITING_OWNER_CONFIRMATION' } }),
        db.order.count({ where: { status: 'CONFIRMED' } }),
        db.order.count({ where: { status: 'PROCESSING' } }),
        db.order.count({ where: { status: 'READY_FOR_PICKUP' } }),
        db.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
        db.order.count({ where: { status: 'COMPLETED' } }),
        db.order.count({ where: { status: 'CANCELLED' } }),
        db.order.count({ where: { paymentStatus: 'PAID' } }),
        db.order.count({ where: { paymentStatus: 'PAYMENT_PENDING' } }),
        db.order.count({ where: { paymentStatus: 'REFUNDED' } }),
        db.order.count({
          where: { paymentStatus: 'UNPAID', status: { in: AWAITING_PAYMENT_ORDER_STATUSES } },
        }),
      ])

    // New orders in the last 7 days for a simple trend line
    const since = new Date(Date.now() - 7 * 24 * 3600_000)
    const recentOrders = await db.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, total: true },
    })

    const revenueAgg = await db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } })

    return ok({
      stats: {
        total,
        awaitingConfirmation,
        newOrders: awaitingConfirmation, // alias per requirement wording
        confirmed,
        awaitingPayment: unpaid + paymentPending,
        paid,
        paymentPending,
        refunded,
        processing,
        readyForPickup,
        outForDelivery,
        completed,
        cancelled,
        paidRevenue: revenueAgg._sum.total ?? 0,
      },
      recent7Days: {
        count: recentOrders.length,
        revenue: recentOrders.reduce((s, o) => s + o.total, 0),
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
