// ---------------------------------------------------------------------------
// MALÈTE KITS — rotate the dashboard admin password on the CURRENT database
// (whatever DATABASE_URL points at — local SQLite or production PostgreSQL).
//
//   bun scripts/set-admin-password.ts              # password from ADMIN_PASSWORD env / .env
//   ADMIN_PASSWORD='new-pass' bun scripts/set-admin-password.ts
//
// If ADMIN_PASSWORD is unset a random 24-char password is generated and
// printed ONCE. Creates the OWNER account if missing, updates the hash if it
// exists, then re-reads the row and verifies the hash round-trip.
// For production PostgreSQL use scripts/rotate-admin-password.sh, which also
// swaps the generated Prisma client to the postgres schema and back.
// ---------------------------------------------------------------------------
import { randomBytes } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword } from '../src/lib/auth'

const db = new PrismaClient({ log: [] })

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'owner@maletekits.com').toLowerCase()
  const generated = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString('hex')

  const existing = await db.adminUser.findUnique({ where: { email } })
  const admin = await db.adminUser.upsert({
    where: { email },
    update: { passwordHash: hashPassword(password), isActive: true },
    create: {
      email,
      name: 'Store Owner',
      role: 'OWNER',
      passwordHash: hashPassword(password),
    },
  })

  // Re-read from the database and prove the stored hash verifies.
  const row = await db.adminUser.findUniqueOrThrow({ where: { email: admin.email } })
  const ok = verifyPassword(password, row.passwordHash)

  if (!ok) {
    console.error(`✗ Verification FAILED for ${row.email} — password NOT rotated correctly.`)
    await db.$disconnect()
    process.exit(1)
  }

  console.log(`✓ Admin password rotated for ${row.email} (${existing ? 'existing account updated' : 'account created'}).`)
  if (generated) {
    console.log(`  New password (shown once — store it now): ${password}`)
  }
  await db.$disconnect()
}

main().catch((err) => {
  console.error('✗ Rotation failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
