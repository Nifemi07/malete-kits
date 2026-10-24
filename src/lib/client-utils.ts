'use client'

// Client-side shared types + fetch helper + formatting.

export interface StoreMeta {
  store: {
    storeName: string
    whatsappNumber: string
    supportEmail: string | null
    storeAddress: string | null
    openingHours: string | null
    announcement: string | null
    deliveryFeeMalete: number
    deliveryFeeOther: number
    customizationFee: number
    pickupFee: number
    promoCode: string | null
    promoPercent: number
    hasPaymentDetails: boolean
  }
  categories: Array<{ id: string; slug: string; name: string; type: string }>
  facets: { teams: string[]; seasons: string[]; leagues: string[] }
}

export interface ProductListItem {
  id: string
  slug: string
  name: string
  teamName: string
  season: string
  kitType: string
  league: string | null
  category: { slug: string; name: string; type: string }
  basePrice: number
  displayPrice: number
  playerVersionAdj: number
  customizationAvailable: boolean
  badge: string | null
  featured: boolean
  imageUrl: string | null
  totalStock: number
  inStock: boolean
}

export interface ProductVariant {
  id: string
  size: string
  stock: number
  price: number | null
  sku: string
}

export interface ProductDetail extends Omit<ProductListItem, 'totalStock' | 'inStock' | 'displayPrice'> {
  description: string
  variants: ProductVariant[]
}

export interface OrderItemView {
  id: string
  productName: string
  teamName: string
  season: string
  kitType: string
  imageUrl: string | null
  jerseyType: string
  size: string
  quantity: number
  unitPrice: number
  custPlayerName: string | null
  custPlayerNumber: number | null
  customizationFee: number
  lineTotal: number
}

export interface OrderStatusEvent {
  id: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  changedBy: string
  createdAt: string
}

export interface OrderView {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  fulfillmentMethod: string
  deliveryZone: string | null
  address: string | null
  landmark: string | null
  instructions: string | null
  subtotal: number
  customizationFee: number
  deliveryFee: number
  discount: number
  promoCode: string | null
  total: number
  paymentStatus: string
  status: string
  internalNotes?: string | null
  cancelReason?: string | null
  createdAt: string
  items: OrderItemView[]
  statusHistory?: OrderStatusEvent[]
  whatsappShareLink?: string | null
  waMessagePreview?: string
}

export class ApiError extends Error {
  status: number
  details?: string[]
  constructor(message: string, status: number, details?: string[]) {
    super(message)
    this.status = status
    this.details = details
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const err = (body ?? {}) as { error?: string; details?: string[] }
    throw new ApiError(err.error ?? `Request failed (${res.status})`, res.status, err.details)
  }
  return body as T
}

export function formatNaira(n: number): string {
  return `₦${new Intl.NumberFormat('en-NG').format(n)}`
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

export function displayPhone(intl: string): string {
  const m = intl.match(/^234(\d{3})(\d{3})(\d{4})$/)
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : intl
}

export const KIT_LABELS: Record<string, string> = { HOME: 'Home', AWAY: 'Away', THIRD: 'Third' }
export const JERSEY_TYPE_LABELS: Record<string, string> = { FAN: 'Fan Version', PLAYER: 'Player Version' }

export const ORDER_STATUS_LABELS: Record<string, string> = {
  AWAITING_OWNER_CONFIRMATION: 'Awaiting Confirmation',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_CUSTOMER_HINTS: Record<string, string> = {
  AWAITING_OWNER_CONFIRMATION:
    'We received your order. Our team is confirming jersey availability — you will be contacted shortly.',
  CONFIRMED: 'Good news — your jerseys are available! Please complete payment as instructed.',
  PROCESSING: 'Your jerseys are being prepared (customization in progress where requested).',
  READY_FOR_PICKUP: 'Your order is packed and ready for pickup in Malete.',
  OUT_FOR_DELIVERY: 'Your order is on the way to your address.',
  COMPLETED: 'Order delivered. Thank you for shopping with MALÈTE KITS!',
  CANCELLED: 'This order was cancelled. Contact us on WhatsApp if you have questions.',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Unpaid',
  PAYMENT_PENDING: 'Payment Pending',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
}

/** Timeline steps shown on the tracking page */
export const TRACKING_STEPS = [
  'AWAITING_OWNER_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP_OR_DELIVERY',
  'COMPLETED',
] as const
