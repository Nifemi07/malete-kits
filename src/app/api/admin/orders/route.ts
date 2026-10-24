import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/orders — searchable, filterable order list.
 * Query: q (order number / name / phone / email), status, payment, page
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number(sp.get('page') ?? 1))
    const pageSize = Math.min(50, Math.max(5, Number(sp.get('pageSize') ?? 20)))

    const where: Record<string, unknown> = {}
    const q = sp.get('q')?.trim()
    if (q) {
      where.OR = [
        { orderNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerPhone: { contains: q.replace(/[\s()-]/g, '') } },
        { customerEmail: { contains: q } },
      ]
    }
    const status = sp.get('status')
    if (status && (ORDER_STATUSES as readonly string[]).includes(status)) where.status = status
    const payment = sp.get('payment')
    if (payment && (PAYMENT_STATUSES as readonly string[]).includes(payment)) where.paymentStatus = payment

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: { select: { id: true, productName: true, size: true, quantity: true, jerseyType: true } } },
      }),
      db.order.count({ where }),
    ])

    return ok({
      orders,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (err) {
    return handleError(err)
  }
}
