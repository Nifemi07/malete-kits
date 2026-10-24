// ---------------------------------------------------------------------------
// WhatsApp notifications — two explicit modes.
//
// MODE A (always available): click-to-chat wa.me links with the order details
//   prefilled. NOTHING is sent automatically in the background — a human taps
//   send. This mode needs zero credentials.
//
// MODE B (optional, automated): Meta WhatsApp Business Cloud API. Requires
//   WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID env vars, and only works
//   after the store owner has configured and tested those credentials.
//   We never claim automation works unless both env vars are present AND the
//   send attempt actually succeeds (result is logged per order).
// ---------------------------------------------------------------------------
import type { PriceResult } from './pricing'
import { formatNairaPlain } from './money'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from './constants'

export interface OrderForMessage {
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string
  fulfillmentMethod: string
  deliveryZone: string | null
  address: string | null
  subtotal: number
  customizationFee: number
  deliveryFee: number
  discount: number
  total: number
  paymentStatus: string
  status: string
  items: Array<{
    productName: string
    jerseyType: string
    size: string
    quantity: number
    custPlayerName: string | null
    custPlayerNumber: number | null
  }>
}

export function buildOwnerNotificationMessage(order: OrderForMessage): string {
  const productLines = order.items
    .map((i) => {
      const type = i.jerseyType === 'PLAYER' ? 'Player Version' : 'Fan Version'
      return `• ${i.productName} (${type}) — Size ${i.size} × ${i.quantity}`
    })
    .join('\n')
  const sizes = order.items.map((i) => `${i.size} ×${i.quantity}`).join(', ')
  const customization = order.items
    .map((i) =>
      i.custPlayerName || i.custPlayerNumber !== null
        ? `${i.productName}: "${i.custPlayerName ?? '—'}" #${i.custPlayerNumber ?? '—'}`
        : null
    )
    .filter(Boolean)
    .join('\n')

  return [
    'NEW JERSEY ORDER',
    'Store: MALÈTE KITS',
    `Order ID: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `Email: ${order.customerEmail}`,
    '',
    'Products:',
    productLines,
    `Sizes: ${sizes}`,
    `Customization: ${customization || 'None'}`,
    `Quantity: ${order.items.reduce((s, i) => s + i.quantity, 0)}`,
    '',
    `Subtotal: ${formatNairaPlain(order.subtotal)}`,
    `Customization: ${formatNairaPlain(order.customizationFee)}`,
    `Delivery: ${formatNairaPlain(order.deliveryFee)}`,
    order.discount > 0 ? `Discount: -${formatNairaPlain(order.discount)}` : '',
    `Total: ${formatNairaPlain(order.total)}`,
    '',
    `Location: ${
      order.fulfillmentMethod === 'PICKUP'
        ? 'Pickup in Malete'
        : `${order.address ?? ''} (${order.deliveryZone === 'OTHER' ? 'Outside Malete' : 'Malete'})`
    }`,
    '',
    `Payment Status: ${order.paymentStatus.replace(/_/g, ' ')}`,
    `Order Status: ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}`,
  ]
    .filter((l) => l !== '')
    .join('\n')
}

/** MODE A — wa.me click-to-chat link (no API, nothing automatic). */
export function buildWhatsAppLink(phoneIntl: string, message: string): string {
  const digits = phoneIntl.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function buildOwnerWhatsAppLink(order: OrderForMessage, ownerPhoneIntl: string): string {
  return buildWhatsAppLink(ownerPhoneIntl, buildOwnerNotificationMessage(order))
}

/** Customer-side helper: customer forwards their own order to the store. */
export function buildCustomerOrderShareLink(order: OrderForMessage, ownerPhoneIntl: string): string {
  return buildWhatsAppLink(ownerPhoneIntl, buildOwnerNotificationMessage(order))
}

export interface WhatsAppSendResult {
  ok: boolean
  error?: string
  provider: string
}

/** Text body used by the automated (MODE B) WhatsApp notification. */
export function buildAutomatedWhatsAppText(order: OrderForMessage): string {
  return buildOwnerNotificationMessage(order)
}

export function isAutomatedWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

/**
 * MODE B — send via Meta WhatsApp Cloud API using a stored payload template.
 * Returns ok:false with a clear reason when credentials are missing (never throws).
 */
export async function sendAutomatedWhatsApp(text: string, recipientIntl: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    return {
      ok: false,
      provider: 'META_CLOUD_API',
      error: 'Automated WhatsApp is not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID. Use the click-to-chat link meanwhile.',
    }
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientIntl.replace(/\D/g, ''),
        type: 'text',
        text: { preview_url: false, body: text },
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, provider: 'META_CLOUD_API', error: `WhatsApp API error ${res.status}: ${body.slice(0, 300)}` }
    }
    return { ok: true, provider: 'META_CLOUD_API' }
  } catch (err) {
    return { ok: false, provider: 'META_CLOUD_API', error: `WhatsApp send failed: ${(err as Error).message}` }
  }
}
