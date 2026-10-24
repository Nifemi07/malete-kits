import { db } from './db'

export type StoreSettingsData = Awaited<ReturnType<typeof getSettings>>

/** Loads the singleton StoreSettings row, creating sensible defaults on first use. */
export async function getSettings() {
  let settings = await db.storeSettings.findUnique({ where: { id: 'singleton' } })
  if (!settings) {
    settings = await db.storeSettings.create({
      data: {
        id: 'singleton',
        whatsappNumber: process.env.OWNER_WHATSAPP_NUMBER ?? '',
        supportEmail: process.env.OWNER_SUPPORT_EMAIL ?? '',
      },
    })
  }
  return settings
}
