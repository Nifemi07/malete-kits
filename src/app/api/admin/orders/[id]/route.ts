import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok, fail } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import {
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  internalNotesSchema,
} from '@/lib/validation'
import { resendConfirmationEmail } from '@/lib/notifications'
import { buildWhatsAppLink, buildOwnerNotificationMessage } from '@/lib/whatsapp'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/** GET /api/admin/orders/[id] — full order detail (authorized only). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        paymentRecords: { orderBy: { createdAt: 'desc' } },
        notificationLogs: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!order) return fail('Order not found', 404)

    const settings = await getSettings()
    const waLink = settings.whatsappNumber
      ? buildWhatsAppLink(settings.whatsappNumber, buildOwnerNotificationMessage(order))
      : null
    const customerWaLink = settings.whatsappNumber ? buildWhatsAppLink(order.customerPhone, `Hello ${order.customerName}, this is MALÈTE KITS regarding your order ${order.orderNumber}. `) : buildWhatsAppLink(order.customerPhone, `Hello ${order.customerName}, this is MALÈTE KITS regarding your order ${order.orderNumber}. `)

    return ok({ order, adminEmail: admin.email, whatsapp: { ownerLink: waLink, customerLink: customerWaLink } })
  } catch (err) {
    return handleError(err)
  }
}

/**
 * PATCH /api/admin/orders/[id] — admin actions, one action per call:
 *  { action: "STATUS", status, note? }            → update order status
 *  { action: "PAYMENT", paymentStatus, method?, reference?, note? } → payment verification
 *  { action: "NOTES", internalNotes }             → internal notes
 *  { action: "CANCEL", note? }                    → cancel + restock
 *  { action: "RESEND_EMAIL" }                     → re-send confirmation email
 *
 * Every change is recorded with WHO made it and WHEN (status history /
 * payment records). Payment status PAID requires a verification note by schema
 * contract — a customer screenshot alone is never accepted as proof.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body || typeof body.action !== 'string') return fail('Missing action', 400)

    const order = await db.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) return fail('Order not found', 404)

    switch (body.action) {
      // ------------------------------------------------------------------
      case 'STATUS': {
        const { status, note } = updateOrderStatusSchema.parse(body)
        if (order.status === 'CANCELLED' && status !== 'CANCELLED') {
          return fail('This order was cancelled — create a new order instead of reopening it.', 400)
        }
        if (order.status === status) return ok({ order })

        const updated = await db.$transaction(async (tx) => {
          // Cancelling restores reserved stock
          if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
            for (const item of order.items) {
              if (!item.variantId) continue
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              })
              await tx.inventoryLog.create({
                data: { variantId: item.variantId, delta: item.quantity, reason: 'ORDER_CANCELLED', note: `Order ${order.orderNumber} cancelled`, adminId: admin.sub },
              })
            }
          }
          // Completing requires payment verified first (business rule)
          if (status === 'COMPLETED' && !['PAID', 'REFUNDED'].includes(order.paymentStatus)) {
            throw new Error('Order must be marked PAID before it can be completed.')
          }
          return tx.order.update({
            where: { id },
            data: {
              status,
              cancelledAt: status === 'CANCELLED' ? new Date() : null,
              cancelReason: status === 'CANCELLED' ? note ?? 'Cancelled by store' : null,
              statusHistory: {
                create: { fromStatus: order.status, toStatus: status, note: note ?? null, changedBy: admin.email },
              },
            },
            include: { items: true },
          })
        })
        return ok({ order: updated })
      }

      // ------------------------------------------------------------------
      case 'PAYMENT': {
        const { paymentStatus, method, reference, note } = updatePaymentStatusSchema.parse(body)
        if (order.paymentStatus === paymentStatus) return ok({ order })

        const updated = await db.$transaction(async (tx) => {
          const o = await tx.order.update({
            where: { id },
            data: {
              paymentStatus,
              paidAt: paymentStatus === 'PAID' ? new Date() : order.paidAt,
              statusHistory: {
                create: {
                  fromStatus: order.status,
                  toStatus: order.status,
                  note: `Payment status → ${paymentStatus}${method ? ` (${method.replace(/_/g, ' ').toLowerCase()})` : ''}`,
                  changedBy: admin.email,
                },
              },
            },
            include: { items: true },
          })
          await tx.paymentRecord.create({
            data: {
              orderId: id,
              paymentStatus,
              previousStatus: order.paymentStatus,
              method: method ?? null,
              amount: paymentStatus === 'PAID' ? order.total : null,
              reference: reference ?? null,
              note: note ?? null,
              recordedBy: admin.email,
              adminId: admin.sub,
            },
          })
          return o
        })
        return ok({ order: updated })
      }

      // ------------------------------------------------------------------
      case 'NOTES': {
        const { internalNotes } = internalNotesSchema.parse(body)
        const updated = await db.order.update({
          where: { id },
          data: { internalNotes },
          include: { items: true },
        })
        return ok({ order: updated })
      }

      // ------------------------------------------------------------------
      case 'CANCEL': {
        if (order.status === 'CANCELLED') return ok({ order })
        const note = typeof body.note === 'string' ? body.note.slice(0, 300) : 'Cancelled by store'
        const updated = await db.$transaction(async (tx) => {
          for (const item of order.items) {
            if (!item.variantId) continue
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            })
            await tx.inventoryLog.create({
              data: { variantId: item.variantId, delta: item.quantity, reason: 'ORDER_CANCELLED', note: `Order ${order.orderNumber} cancelled`, adminId: admin.sub },
            })
          }
          return tx.order.update({
            where: { id },
            data: {
              status: 'CANCELLED',
              paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus,
              cancelledAt: new Date(),
              cancelReason: note,
              statusHistory: {
                create: { fromStatus: order.status, toStatus: 'CANCELLED', note, changedBy: admin.email },
              },
            },
            include: { items: true },
          })
        })
        return ok({ order: updated })
      }

      // ------------------------------------------------------------------
      case 'RESEND_EMAIL': {
        const result = await resendConfirmationEmail(id)
        if (!result.ok) return fail(result.error ?? 'Email resend failed', 502)
        return ok({ resent: true })
      }

      default:
        return fail(`Unknown action "${body.action}"`, 400)
    }
  } catch (err) {
    return handleError(err)
  }
}
