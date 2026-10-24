// ---------------------------------------------------------------------------
// Server-side validation schemas (zod) — the ONLY source of validation truth.
// Client-side validation mirrors these for UX, but never replaces them.
// ---------------------------------------------------------------------------
import { z } from 'zod'
import {
  CART_LINE_LIMIT,
  CUSTOMIZATION,
  DELIVERY_ZONES,
  FULFILLMENT_METHODS,
  JERSEY_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  QUANTITY_LIMITS,
  SIZES,
} from './constants'

// --- Nigerian phone numbers -------------------------------------------------
const NG_LOCAL = /^([789][01]\d{8})$/ // 9 digits after 234 / leading 0

export function normalizeNgPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s()-]/g, '')
  let m = cleaned.match(/^\+?234(\d{10})$/)
  if (m && NG_LOCAL.test(m[1])) return `234${m[1]}`
  m = cleaned.match(/^0(\d{10})$/)
  if (m && NG_LOCAL.test(m[1])) return `234${m[1]}`
  return null
}

export function isNigerianPhone(raw: string): boolean {
  return normalizeNgPhone(raw) !== null
}

/** Formats 234XXXXXXXXXX into a readable local style: 0801 234 5678 */
export function displayPhone(intlPhone: string): string {
  const m = intlPhone.match(/^234(\d{3})(\d{3})(\d{4})$/)
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : intlPhone
}

// --- Order items -------------------------------------------------------------
export const customizationSchema = z
  .object({
    playerName: z.string().trim().max(CUSTOMIZATION.nameMaxLength).optional(),
    playerNumber: z.coerce.number().int().min(CUSTOMIZATION.numberMin).max(CUSTOMIZATION.numberMax).optional(),
  })
  .optional()
  .refine(
    (c) => {
      if (!c) return true
      if (c.playerName && c.playerName.trim().length > 0 && c.playerName.trim().length < CUSTOMIZATION.nameMinLength)
        return false
      if (c.playerName && !CUSTOMIZATION.namePattern.test(c.playerName.trim())) return false
      return true
    },
    { message: 'Custom player name may only contain letters, spaces, dots, apostrophes and hyphens (max 12 chars).' }
  )

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().min(1, 'Size selection is required'),
  jerseyType: z.enum(JERSEY_TYPES),
  size: z.enum(SIZES),
  quantity: z.coerce
    .number()
    .int()
    .min(QUANTITY_LIMITS.min)
    .max(QUANTITY_LIMITS.max),
  customization: customizationSchema,
})

// --- Checkout ----------------------------------------------------------------
export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().min(8).max(64),
    fullName: z.string().trim().min(2, 'Full name is required').max(80),
    email: z.string().trim().toLowerCase().email('A valid email address is required').max(120),
    phone: z
      .string()
      .trim()
      .refine(isNigerianPhone, 'Enter a valid Nigerian phone number (e.g. 08012345678)'),
    items: z.array(orderItemInputSchema).min(1, 'Your cart is empty').max(CART_LINE_LIMIT),
    fulfillmentMethod: z.enum(FULFILLMENT_METHODS),
    deliveryZone: z.enum(DELIVERY_ZONES).optional().nullable(),
    address: z.string().trim().max(240).optional().nullable(),
    landmark: z.string().trim().max(120).optional().nullable(),
    instructions: z.string().trim().max(500).optional().nullable(),
    promoCode: z.string().trim().max(24).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentMethod === 'DELIVERY') {
      if (!data.deliveryZone) {
        ctx.addIssue({ code: 'custom', path: ['deliveryZone'], message: 'Choose a delivery zone' })
      }
      if (!data.address || data.address.length < 6) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: 'Enter your hostel, lodge or delivery address in Malete' })
      }
    }
  })

export type CheckoutInput = z.infer<typeof checkoutSchema>

// --- Order tracking ----------------------------------------------------------
export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(3).max(20),
  identifier: z
    .string()
    .trim()
    .min(3, 'Enter the email or phone number used for the order')
    .max(120),
})

// --- Admin auth --------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
})

// --- Admin actions -----------------------------------------------------------
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'AWAITING_OWNER_CONFIRMATION',
    'CONFIRMED',
    'PROCESSING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
  ]),
  note: z.string().trim().max(300).optional(),
})

export const updatePaymentStatusSchema = z
  .object({
    paymentStatus: z.enum(PAYMENT_STATUSES),
    method: z.enum(PAYMENT_METHODS).optional().nullable(),
    reference: z.string().trim().max(80).optional().nullable(),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // PAID requires an explicit verification trail — a customer screenshot or
    // verbal claim is never sufficient on its own.
    if (data.paymentStatus === 'PAID') {
      if (!data.method) {
        ctx.addIssue({ code: 'custom', path: ['method'], message: 'Record how the payment was verified (bank transfer or cash)' })
      }
      if (!data.note || data.note.trim().length < 4) {
        ctx.addIssue({
          code: 'custom',
          path: ['note'],
          message: 'Describe how you verified this payment (e.g. "Checked bank app, credit alert of ₦18,500 seen")',
        })
      }
    }
    if (data.paymentStatus === 'REFUNDED' && (!data.note || data.note.trim().length < 4)) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Record the refund details (date, method, amount)' })
    }
  })

export const internalNotesSchema = z.object({
  internalNotes: z.string().trim().max(2000),
})

export const stockUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        variantId: z.string().min(1),
        stock: z.coerce.number().int().min(0).max(999),
      })
    )
    .min(1)
    .max(200),
})

export const settingsSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .refine((v) => v === '' || isNigerianPhone(v), 'Use a valid Nigerian number, e.g. 08012345678')
    .transform((v) => (v ? normalizeNgPhone(v) ?? '' : '')),
  supportEmail: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  storeAddress: z.string().trim().max(200).optional().or(z.literal('')),
  openingHours: z.string().trim().max(120).optional().or(z.literal('')),
  announcement: z.string().trim().max(160).optional().or(z.literal('')),
  bankName: z.string().trim().max(80).optional().or(z.literal('')),
  accountName: z.string().trim().max(80).optional().or(z.literal('')),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Nigerian account numbers are 10 digits')
    .optional()
    .or(z.literal('')),
  acceptedPaymentMethods: z.string().trim().max(120).optional().or(z.literal('')),
  cashInstructions: z.string().trim().max(400).optional().or(z.literal('')),
  paymentInstructions: z.string().trim().max(600).optional().or(z.literal('')),
  deliveryFeeMalete: z.coerce.number().int().min(0).max(50000),
  deliveryFeeOther: z.coerce.number().int().min(0).max(100000),
  customizationFee: z.coerce.number().int().min(0).max(20000),
  pickupFee: z.coerce.number().int().min(0).max(20000),
  promoCode: z.string().trim().max(24).optional().or(z.literal('')),
  promoPercent: z.coerce.number().int().min(0).max(50),
  promoMaxNaira: z.coerce.number().int().min(0).max(50000),
})

export type SettingsInput = z.infer<typeof settingsSchema>
