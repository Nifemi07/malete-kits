import { NextRequest, after } from 'next/server'
import { db } from '@/lib/db'
import { checkoutSchema } from '@/lib/validation'
import { normalizeNgPhone } from '@/lib/validation'
import { priceOrder, PricingError } from '@/lib/pricing'
import { nextOrderNumber, generateTrackingToken } from '@/lib/order-number'
import { dispatchOrderNotifications } from '@/lib/notifications'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { handleError, ok, fail } from '@/lib/api-helpers'
import { getSettings } from '@/lib/settings'
import { buildWhatsAppLink, buildOwnerNotificationMessage } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orders — create a new order.
 *
 * ORDER CREATION CONTRACT (see requirements §4):
 *  1. Validate payload server-side (zod).
 *  2. Re-price every line from DB truth (never trust client totals).
 *  3. Verify stock atomically inside a transaction.
 *  4. Generate sequential order number (MK-1024, MK-1025, …).
 *  5. Save order + items + initial status history.
 *  6. paymentStatus = UNPAID, status = AWAITING_OWNER_CONFIRMATION.
 *  7. After commit → email + WhatsApp notifications (failures logged, never fatal).
 *
 * DUPLICATE PROTECTION: the client supplies an idempotencyKey (UUID). A repeated
 * submission with the same key returns the ORIGINAL order instead of creating a
 * second one. The key has a UNIQUE constraint in the database.
 */
export async function POST(req: NextRequest) {
  try {
    // Basic abuse protection — one store, keep it tidy.
    const rl = rateLimit(`order:${clientIp(req)}`, 20, 10 * 60_000)
    if (!rl.ok) {
      return fail(`Too many order attempts. Please try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).`, 429)
    }

    const body = await req.json().catch(() => null)
    if (!body) return fail('Invalid request body', 400)

    const input = checkoutSchema.parse(body)

    // ---- Idempotency: same key returns the original order --------------------
    const existing = await db.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { items: true },
    })
    if (existing) {
      const settings = await getSettings()
      return ok({
        duplicate: true,
        order: serialize(existing, settings.whatsappNumber),
      })
    }

    // ---- Server-side pricing (throws PricingError on any invalid line) ------
    const priced = await priceOrder(input)

    const phoneIntl = normalizeNgPhone(input.phone)!
    const trackingToken = generateTrackingToken()

    // ---- Transaction: stock check + decrement + order creation --------------
    const created = await db.$transaction(async (tx) => {
      // Re-verify stock inside the transaction (guards against concurrent orders)
      for (const item of priced.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant || variant.stock < item.quantity) {
          throw new PricingError(
            `${item.productName} (${item.size}) just sold out or has fewer than ${item.quantity} left. Please adjust your cart.`
          )
        }
      }

      const orderNumber = await nextOrderNumber(tx as never)

      // Upsert customer by phone (lightweight guest profiles)
      const customer = await tx.customer.upsert({
        where: { phone: phoneIntl },
        update: { name: input.fullName, email: input.email },
        create: { name: input.fullName, email: input.email, phone: phoneIntl },
      })

      const order = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey: input.idempotencyKey,
          customerId: customer.id,
          customerName: input.fullName,
          customerEmail: input.email,
          customerPhone: phoneIntl,
          fulfillmentMethod: input.fulfillmentMethod,
          deliveryZone: input.fulfillmentMethod === 'DELIVERY' ? input.deliveryZone ?? 'MALETE' : null,
          address: input.fulfillmentMethod === 'DELIVERY' ? input.address ?? null : null,
          landmark: input.landmark ?? null,
          instructions: input.instructions ?? null,
          subtotal: priced.subtotal,
          customizationFee: priced.customizationFee,
          deliveryFee: priced.deliveryFee,
          discount: priced.discount,
          promoCode: priced.promoCode,
          total: priced.total,
          paymentStatus: 'UNPAID',
          status: 'AWAITING_OWNER_CONFIRMATION',
          trackingToken,
          items: {
            create: priced.items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              productName: i.productName,
              teamName: i.teamName,
              season: i.season,
              kitType: i.kitType,
              league: i.league,
              imageUrl: i.imageUrl,
              jerseyType: i.jerseyType,
              size: i.size,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              custPlayerName: i.custPlayerName,
              custPlayerNumber: i.custPlayerNumber,
              customizationFee: i.customizationFee,
              lineTotal: i.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: 'AWAITING_OWNER_CONFIRMATION',
              note: 'Order placed from website',
              changedBy: 'SYSTEM',
            },
          },
        },
        include: { items: true },
      })

      // Reserve stock + audit trail
      for (const item of priced.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            delta: -item.quantity,
            reason: 'ORDER_CREATED',
            note: `Order ${orderNumber}`,
          },
        })
      }

      return order
    })

    // ---- Order is SAVED. Now (and only now) attempt notifications. ----------
    // `after()` runs reliably once the response is dispatched; failures are
    // logged and retryable from the admin dashboard. The order can never be lost.
    after(async () => {
      await dispatchOrderNotifications(created.id)
    })

    const settings = await getSettings()
    return ok({ duplicate: false, order: serialize(created, settings.whatsappNumber) }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function serialize(order: { [k: string]: unknown; items: unknown[] }, ownerWhatsapp: string) {
  const waMessage = buildOwnerNotificationMessage(order as never)
  return {
    ...order,
    whatsappShareLink: ownerWhatsapp
      ? buildWhatsAppLink(ownerWhatsapp, waMessage)
      : null,
    waMessagePreview: waMessage,
  }
}
