import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackOrderSchema, normalizeNgPhone } from '@/lib/validation'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { handleError, ok, fail } from '@/lib/api-helpers'
import { buildWhatsAppLink, buildOwnerNotificationMessage } from '@/lib/whatsapp'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/track — customer order tracking.
 *
 * Access requires the order number PLUS a matching identifier (the email OR the
 * phone number used at checkout). Rate-limited to slow enumeration attempts.
 * Only the customer's own order is ever returned — no cross-customer leakage.
 *
 * GET /api/orders/track?token=… — direct access via the secure tracking token
 * that was issued on the confirmation page (unpredictable, 48 hex chars).
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`track:${clientIp(req)}`, 40, 10 * 60_000)
    if (!rl.ok) {
      return fail(`Too many attempts. Please try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).`, 429)
    }

    const body = await req.json().catch(() => null)
    if (!body) return fail('Invalid request body', 400)
    const { orderNumber, identifier } = trackOrderSchema.parse(body)

    const order = await db.order.findUnique({
      where: { orderNumber: orderNumber.toUpperCase() },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' as const } } },
    })

    // Uniform "not found" response — never reveal whether the order number exists.
    if (!order) return fail('We could not find an order with those details. Check the order number and try again.', 404)

    const ident = identifier.toLowerCase()
    const phoneDigits = identifier.replace(/[\s()-]/g, '')
    const emailMatch = order.customerEmail.toLowerCase() === ident
    const phoneMatch =
      order.customerPhone === phoneDigits ||
      normalizeNgPhone(identifier) === order.customerPhone ||
      `0${order.customerPhone.slice(3)}` === phoneDigits

    if (!emailMatch && !phoneMatch) {
      return fail('We could not find an order with those details. Check the order number and try again.', 404)
    }

    return ok({ order: await serializeForCustomer(order) })
  } catch (err) {
    return handleError(err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token || token.length < 24) return fail('Invalid tracking link', 400)
    const rl = rateLimit(`trackget:${clientIp(req)}`, 60, 10 * 60_000)
    if (!rl.ok) return fail('Too many attempts — slow down.', 429)

    const order = await db.order.findUnique({
      where: { trackingToken: token },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' as const } } },
    })
    if (!order) return fail('This tracking link is invalid or the order no longer exists.', 404)
    return ok({ order: await serializeForCustomer(order) })
  } catch (err) {
    return handleError(err)
  }
}

/**
 * Customer-safe serialization: strips secrets, attaches the MODE A WhatsApp
 * click-to-chat link when the owner's WhatsApp number is configured.
 */
async function serializeForCustomer(order: { [k: string]: unknown; items: unknown[] }) {
  const { idempotencyKey, trackingToken, customerId, ...safe } = order as Record<string, unknown>
  void idempotencyKey
  void customerId
  let whatsappShareLink: string | null = null
  try {
    const settings = await getSettings()
    if (settings.whatsappNumber) {
      whatsappShareLink = buildWhatsAppLink(
        settings.whatsappNumber,
        buildOwnerNotificationMessage(order as never)
      )
    }
  } catch {
    // settings unavailable — link stays null, page degrades gracefully
  }
  return {
    ...safe,
    trackingToken: undefined,
    whatsappShareLink,
  }
}
