import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * Public metadata for the storefront:
 * store info, categories, filter facets (teams/seasons/leagues), fees, promo hint.
 */
export async function GET(_req: NextRequest) {
  const [settings, categories, products] = await Promise.all([
    getSettings(),
    db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.product.findMany({
      where: { active: true },
      select: { teamName: true, season: true, league: true, categoryId: true },
    }),
  ])

  const teams = [...new Set(products.map((p) => p.teamName))].sort()
  const seasons = [...new Set(products.map((p) => p.season))].sort().reverse()
  const leagues = [...new Set(products.map((p) => p.league).filter(Boolean))].sort() as string[]

  return NextResponse.json({
    store: {
      storeName: settings.storeName,
      whatsappNumber: settings.whatsappNumber,
      supportEmail: settings.supportEmail,
      storeAddress: settings.storeAddress,
      openingHours: settings.openingHours,
      announcement: settings.announcement,
      deliveryFeeMalete: settings.deliveryFeeMalete,
      deliveryFeeOther: settings.deliveryFeeOther,
      customizationFee: settings.customizationFee,
      pickupFee: settings.pickupFee,
      promoCode: settings.promoCode,
      promoPercent: settings.promoPercent,
      // Bank details are NOT exposed here — they only appear on the
      // order confirmation + tracking page after an order exists.
      hasPaymentDetails: Boolean(settings.bankName && settings.accountName && settings.accountNumber),
    },
    categories,
    facets: { teams, seasons, leagues },
  })
}
