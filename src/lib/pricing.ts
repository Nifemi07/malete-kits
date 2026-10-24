// ---------------------------------------------------------------------------
// Server-side pricing engine.
// The client's displayed totals are advisory ONLY — every order is re-priced
// here from database truth before it is saved.
// ---------------------------------------------------------------------------
import { CUSTOMIZATION } from './constants'
import type { CheckoutInput } from './validation'
import { db } from './db'
import { getSettings } from './settings'

export interface PricedItem {
  productId: string
  variantId: string
  productName: string
  teamName: string
  season: string
  kitType: string
  league: string | null
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

export interface PriceResult {
  items: PricedItem[]
  subtotal: number
  customizationFee: number
  deliveryFee: number
  discount: number
  promoCode: string | null
  total: number
}

export class PricingError extends Error {
  status: number
  details?: string[]
  constructor(message: string, details?: string[]) {
    super(message)
    this.status = 400
    this.details = details
  }
}

export async function priceOrder(input: CheckoutInput): Promise<PriceResult> {
  const settings = await getSettings()

  // Load all products + variants in one query — fail fast on anything invalid.
  const productIds = [...new Set(input.items.map((i) => i.productId))]
  const products = await db.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: { variants: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const priced: PricedItem[] = []
  const errors: string[] = []

  for (const item of input.items) {
    const product = productMap.get(item.productId)
    if (!product) {
      errors.push('A jersey in your cart is no longer available. Please refresh your cart.')
      continue
    }
    const variant = product.variants.find((v) => v.id === item.variantId && v.active)
    if (!variant) {
      errors.push(`${product.name}: selected size is unavailable.`)
      continue
    }
    if (variant.size !== item.size) {
      errors.push(`${product.name}: size mismatch — please reselect.`)
      continue
    }
    if (variant.stock < item.quantity) {
      errors.push(
        `${product.name} (${variant.size}): only ${variant.stock} left in stock — reduce the quantity.`
      )
      continue
    }

    // Unit price = variant override ?? product base, plus player-version adjustment.
    const base = variant.price ?? product.basePrice
    const unitPrice = item.jerseyType === 'PLAYER' ? base + product.playerVersionAdj : base

    // Customization fee only when the product allows it and details were provided.
    let customizationFee = 0
    const wantsCustomization =
      product.customizationAvailable &&
      !!(item.customization?.playerName?.trim() || item.customization?.playerNumber !== undefined)
    if (wantsCustomization) {
      customizationFee = settings.customizationFee * item.quantity
    }

    const lineTotal = unitPrice * item.quantity + customizationFee
    priced.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      teamName: product.teamName,
      season: product.season,
      kitType: product.kitType,
      league: product.league,
      imageUrl: product.imageUrl,
      jerseyType: item.jerseyType,
      size: variant.size,
      quantity: item.quantity,
      unitPrice,
      custPlayerName: wantsCustomization ? item.customization?.playerName?.trim().toUpperCase() ?? null : null,
      custPlayerNumber: wantsCustomization ? item.customization?.playerNumber ?? null : null,
      customizationFee,
      lineTotal,
    })
  }

  if (errors.length) throw new PricingError(errors[0], errors)

  const subtotal = priced.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const customizationFee = priced.reduce((s, i) => s + i.customizationFee, 0)

  // Delivery / pickup fees from store settings (owner-controlled).
  let deliveryFee = 0
  if (input.fulfillmentMethod === 'DELIVERY') {
    deliveryFee = input.deliveryZone === 'OTHER' ? settings.deliveryFeeOther : settings.deliveryFeeMalete
  } else {
    deliveryFee = settings.pickupFee
  }

  // Promo discount — validated strictly against settings (never client-supplied %).
  let discount = 0
  let promoCode: string | null = null
  if (input.promoCode && settings.promoCode && settings.promoPercent > 0) {
    if (input.promoCode.toUpperCase() === settings.promoCode.toUpperCase()) {
      promoCode = settings.promoCode
      discount = Math.min(
        Math.floor((subtotal * settings.promoPercent) / 100),
        settings.promoMaxNaira || Number.MAX_SAFE_INTEGER
      )
    }
    // Unknown codes are silently ignored — the customer simply pays standard price.
  }

  const total = subtotal + customizationFee + deliveryFee - discount
  if (total < 0) throw new PricingError('Order total is invalid. Please refresh and try again.')

  return { items: priced, subtotal, customizationFee, deliveryFee, discount, promoCode, total }
}
