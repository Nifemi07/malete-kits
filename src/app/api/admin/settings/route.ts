import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api-helpers'
import { getSettings } from '@/lib/settings'
import { db } from '@/lib/db'
import { settingsSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/** GET /api/admin/settings — full store settings (authorized only). */
export async function GET() {
  try {
    await requireAdmin()
    const settings = await getSettings()
    return ok({ settings })
  } catch (err) {
    return handleError(err)
  }
}

/** PUT /api/admin/settings — update store settings (payment config, fees, promo). */
export async function PUT(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })
    const input = settingsSchema.parse(body)

    const settings = await db.storeSettings.upsert({
      where: { id: 'singleton' },
      update: {
        whatsappNumber: input.whatsappNumber,
        supportEmail: input.supportEmail || null,
        storeAddress: input.storeAddress || null,
        openingHours: input.openingHours || null,
        announcement: input.announcement || null,
        bankName: input.bankName || null,
        accountName: input.accountName || null,
        accountNumber: input.accountNumber || null,
        acceptedPaymentMethods: input.acceptedPaymentMethods || null,
        cashInstructions: input.cashInstructions || null,
        paymentInstructions: input.paymentInstructions || null,
        deliveryFeeMalete: input.deliveryFeeMalete,
        deliveryFeeOther: input.deliveryFeeOther,
        customizationFee: input.customizationFee,
        pickupFee: input.pickupFee,
        promoCode: input.promoCode || null,
        promoPercent: input.promoPercent,
        promoMaxNaira: input.promoMaxNaira,
      },
      create: { id: 'singleton', ...input, supportEmail: input.supportEmail || null },
    })
    return ok({ settings })
  } catch (err) {
    return handleError(err)
  }
}
