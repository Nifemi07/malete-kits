// ---------------------------------------------------------------------------
// MALÈTE KITS — domain constants (single source of truth, shared client/server)
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'AWAITING_OWNER_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['UNPAID', 'PAYMENT_PENDING', 'PAID', 'REFUNDED'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const FULFILLMENT_METHODS = ['PICKUP', 'DELIVERY'] as const
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number]

export const DELIVERY_ZONES = ['MALETE', 'OTHER'] as const
export type DeliveryZone = (typeof DELIVERY_ZONES)[number]

export const JERSEY_TYPES = ['FAN', 'PLAYER'] as const
export type JerseyType = (typeof JERSEY_TYPES)[number]

export const KIT_TYPES = ['HOME', 'AWAY', 'THIRD'] as const
export type KitType = (typeof KIT_TYPES)[number]

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export type Size = (typeof SIZES)[number]

export const NOTIFICATION_CHANNELS = ['EMAIL', 'WHATSAPP'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH'] as const

// ---------------------------------------------------------------------------
// Friendly labels for statuses (used in UI + emails)
// ---------------------------------------------------------------------------

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_OWNER_CONFIRMATION: 'Awaiting Owner Confirmation',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_CUSTOMER_HINTS: Record<OrderStatus, string> = {
  AWAITING_OWNER_CONFIRMATION:
    'We received your order. Our team is confirming jersey availability — you will be contacted shortly.',
  CONFIRMED: 'Good news — your jerseys are available! Please complete payment as instructed.',
  PROCESSING: 'Your jerseys are being prepared (customization in progress where requested).',
  READY_FOR_PICKUP: 'Your order is packed and ready for pickup in Malete.',
  OUT_FOR_DELIVERY: 'Your order is on the way to your address.',
  COMPLETED: 'Order delivered. Thank you for shopping with MALÈTE KITS!',
  CANCELLED: 'This order was cancelled. Contact us on WhatsApp if you have questions.',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PAYMENT_PENDING: 'Payment Pending Verification',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
}

// Which order statuses count as "awaiting payment" on the dashboard
export const AWAITING_PAYMENT_ORDER_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
]

// ---------------------------------------------------------------------------
// Business rules
// ---------------------------------------------------------------------------

export const ORDER_NUMBER_PREFIX = 'MK'
export const ORDER_NUMBER_START = 1023 // first generated order becomes MK-1024

export const QUANTITY_LIMITS = { min: 1, max: 10 } as const
export const CART_LINE_LIMIT = 20
export const CUSTOMIZATION = {
  nameMinLength: 1,
  nameMaxLength: 12,
  numberMin: 0,
  numberMax: 99,
  namePattern: /^[A-Za-z .'-]+$/,
} as const

export const GUEST_CHECKOUT = true // no account required
