// ---------------------------------------------------------------------------
// MALÈTE KITS — one-off provisioning of the real store owner + WhatsApp number.
//
//   bun scripts/provision-owner.ts
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… OWNER_WHATSAPP_NUMBER=… bun scripts/provision-owner.ts
//
// Does three things on the CURRENT database:
//   1. Upserts the OWNER admin (email + password from env; defaults below).
//   2. Deactivates the generic owner@maletekits.com account if it exists.
//   3. Normalizes and stores the owner WhatsApp number in StoreSettings.
// Safe to re-run.
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword } from '../src/lib/auth'
import { normalizeNgPhone } from '../src/lib/validation'

const db = new PrismaClient({ log: [] })

const EMAIL = (process.env.ADMIN_EMAIL || 'nifemionawola@gmail.com').toLowerCase()
const PASSWORD = process.env.ADMIN_PASSWORD || 'Nifemisarz07'
const PHONE = process.env.OWNER_WHATSAPP_NUMBER || '09134980059'
const LEGACY_ADMIN = 'owner@maletekits.com'

async function main() {
  if (PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters')

  // 1) Owner admin ------------------------------------------------------------
  const admin = await db.adminUser.upsert({
    where: { email: EMAIL },
    update: { passwordHash: hashPassword(PASSWORD), isActive: true, role: 'OWNER' },
    create: {
      email: EMAIL,
      name: 'Nifemi Onawola',
      role: 'OWNER',
      passwordHash: hashPassword(PASSWORD),
    },
  })
  const row = await db.adminUser.findUniqueOrThrow({ where: { id: admin.id } })
  if (!verifyPassword(PASSWORD, row.passwordHash)) throw new Error('Password verification failed after write')

  // 2) Retire the generic seeded admin (unless it IS this account) --------------
  if (EMAIL !== LEGACY_ADMIN) {
    const legacy = await db.adminUser.findUnique({ where: { email: LEGACY_ADMIN } })
    if (legacy && legacy.isActive) {
      await db.adminUser.update({ where: { id: legacy.id }, data: { isActive: false } })
      console.log(`✓ Deactivated legacy admin ${LEGACY_ADMIN}`)
    }
  }

  // 3) WhatsApp number (same normalization the admin settings form applies) ----
  const intl = normalizeNgPhone(PHONE)
  if (!intl) throw new Error(`Not a valid Nigerian number: ${PHONE}`)
  await db.storeSettings.upsert({
    where: { id: 'singleton' },
    update: { whatsappNumber: intl },
    create: { id: 'singleton', whatsappNumber: intl },
  })

  console.log(`✓ Admin: ${row.email} (${row.role}, ${existing(row)} ) — password verified against the database`)
  console.log(`✓ WhatsApp: ${PHONE} → stored as ${intl} (wa.me links now active)`)
  await db.$disconnect()
}

function existing(row: { createdAt: Date; updatedAt: Date }): string {
  return row.createdAt.getTime() === row.updatedAt.getTime() ? 'created' : 'updated'
}

main().catch((err) => {
  console.error('✗ Provisioning failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
