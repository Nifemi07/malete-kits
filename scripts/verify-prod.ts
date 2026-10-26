// ---------------------------------------------------------------------------
// MALÈTE KITS — sanity-check the freshly provisioned production database.
// Run (after generating the Postgres client):
//   bunx prisma generate --schema prisma/schema.prod.prisma
//   DATABASE_URL="postgres://..." bun scripts/verify-prod.ts
//   bunx prisma generate   # restore the local SQLite client afterwards
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const [products, variants, admins, orders, counter, settings] = await Promise.all([
  db.product.count(),
  db.productVariant.count(),
  db.adminUser.count(),
  db.order.count(),
  db.counter.findUnique({ where: { id: 'ORDER' } }),
  db.storeSettings.findUnique({ where: { id: 'singleton' } }),
])

console.log(JSON.stringify(
  {
    products,
    variants,
    admins,
    orders,
    nextOrderNumber: counter ? `MK-${counter.value + 1}` : null,
    store: settings
      ? {
          name: settings.storeName,
          whatsapp: settings.whatsappNumber,
          email: settings.supportEmail,
          bank: settings.bankName,
          accountName: settings.accountName,
          accountNumber: settings.accountNumber,
          paymentMethods: settings.acceptedPaymentMethods,
          promo: `${settings.promoCode} — ${settings.promoPercent}% (max ₦${settings.promoMaxNaira})`,
          fees: { malete: settings.deliveryFeeMalete, other: settings.deliveryFeeOther, customization: settings.customizationFee },
          hasPaymentDetails: !!(settings.bankName && settings.accountName && settings.accountNumber),
        }
      : null,
  },
  null,
  2,
))

await db.$disconnect()
