import { db } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'
import { handleError, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/orders — the signed-in customer's own orders, matched by
 * the email they verified. Only the account's own email is ever searched, and
 * tracking tokens are included so the UI can deep-link to full tracking.
 */
export async function GET() {
  try {
    const session = await requireCustomer()

    const orders = await db.order.findMany({
      where: { customerEmail: session.email },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: true },
    })

    return ok({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        trackingToken: o.trackingToken,
        customerName: o.customerName,
        fulfillmentMethod: o.fulfillmentMethod,
        deliveryZone: o.deliveryZone,
        address: o.address,
        subtotal: o.subtotal,
        customizationFee: o.customizationFee,
        deliveryFee: o.deliveryFee,
        discount: o.discount,
        total: o.total,
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          id: i.id,
          productName: i.productName,
          teamName: i.teamName,
          kitType: i.kitType,
          imageUrl: i.imageUrl,
          jerseyType: i.jerseyType,
          size: i.size,
          quantity: i.quantity,
          custPlayerName: i.custPlayerName,
          custPlayerNumber: i.custPlayerNumber,
          lineTotal: i.lineTotal,
        })),
      })),
    })
  } catch (err) {
    return handleError(err)
  }
}
