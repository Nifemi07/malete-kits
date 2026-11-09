// ---------------------------------------------------------------------------
// MALÈTE KITS — seed data
// Run: bun prisma/seed.ts   (idempotent — safe to re-run)
//
// NOTE: No bank account details are seeded. The store owner must configure
// payment details in the admin dashboard (Settings) — we never invent them.
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import { hashPassword } from '../src/lib/auth'

const db = new PrismaClient()

// --- helpers -----------------------------------------------------------------
function stockFor(index: number): number {
  // deterministic pseudo-stock 0..12 — includes a couple of zero-stock sizes to
  // demonstrate the sold-out UX
  const pattern = [8, 5, 12, 9, 6, 3, 10, 4, 0, 7, 11, 2]
  return pattern[index % pattern.length]
}

interface ProductSeed {
  slug: string
  name?: string // override the generated "Team Home Shirt 26/27" name
  desc?: string // override the generated description (authentic items)
  teamName: string
  season: string
  kitType: 'HOME' | 'AWAY' | 'THIRD'
  league: string
  categoryType: 'CLUB' | 'NATIONAL'
  price: number
  image: string | null
  badge?: string
  featured?: boolean
  blurb?: string // used by description() unless desc overrides it
}

// ---------------------------------------------------------------------------
// CATALOG — mirrors mysportskit.com.ng jerseys and prices (captured 9 Nov 2026
// from their listings/snippets; every price verified in scripts/verify-prices.py).
// Base price = the site's "from" price for the fan version.
// ---------------------------------------------------------------------------
const PRODUCTS: ProductSeed[] = [
  // ---------- CLUB TEAMS ----------
  { slug: 'real-madrid-home-26-27', teamName: 'Real Madrid', season: '26/27', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 24999, image: '/images/products/realmadrid-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'Los Blancos never go out of style. The 26/27 Real Madrid home shirt keeps the iconic all-white look with gold accents — the same energy as the Bernabéu on a UCL night. Instantly recognisable on campus, matchday or class.' },
  { slug: 'real-madrid-away-26-27', teamName: 'Real Madrid', season: '26/27', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 24999, image: '/images/products/realmadrid-home.webp', badge: 'NEW',
    blurb: 'The Real Madrid away shirt for 26/27 — a clean, modern take on the Merengues travel colours. Subtle, sharp and instantly recognisable on campus.' },
  { slug: 'barcelona-home-26-27', teamName: 'FC Barcelona', season: '26/27', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 24950, image: '/images/products/barcelona-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'Blaugrana pride in its purest form. The 26/27 Barça home shirt carries the legendary stripes with a fresh modern collar. For every culer in KWASU — Més que un club.' },
  { slug: 'arsenal-home-26-27', teamName: 'Arsenal', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: '/images/products/arsenal-home.webp', badge: 'NEW', featured: true,
    blurb: 'The Gunners’ classic red and white for 26/27. North London standard, Malete approved. COYG!' },
  { slug: 'arsenal-away-26-27', teamName: 'Arsenal', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/arsenal-home.webp', badge: 'NEW',
    blurb: 'Arsenal’s 26/27 away shirt — sleek, dark and deadly, just like their counter-attacks.' },
  { slug: 'arsenal-jvc-retro-1990', name: 'Arsenal JVC All-Black 1990 Retro Jersey', teamName: 'Arsenal', season: '1990', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: '/images/products/arsenal-retro-1990.jpg',
    blurb: 'The legendary all-black JVC-era shirt from 1990 — a cult classic reborn. For Gunners who know their history, not just their table position.' },
  { slug: 'arsenal-authentic-home-25-26', name: 'Arsenal Authentic Home Shirt 25/26 (Player Spec)', teamName: 'Arsenal', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 32999, image: '/images/products/arsenal-authentic-home-25-26.jpg',
    desc: 'The real deal: the AUTHENTIC (player-spec) Arsenal 25/26 home shirt — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'arsenal-authentic-away-25-26', name: 'Arsenal Authentic Away Shirt 25/26 (Player Spec)', teamName: 'Arsenal', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 32999, image: '/images/products/arsenal-authentic-away-25-26.jpg',
    desc: 'The AUTHENTIC (player-spec) Arsenal 25/26 away shirt — the exact fit, fabric and tech the pros wear on the road, not the fan replica. Slim athletic fit; consider one size up.\n\nAdd your name and favourite number in the official font at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'chelsea-home-26-27', teamName: 'Chelsea', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/chelsea-home.webp', badge: 'NEW',
    blurb: 'Blues forever. The 26/27 Chelsea home shirt in royal blue with clean white detailing — a staple for any Stamford Bridge faithful.' },
  { slug: 'chelsea-away-26-27', teamName: 'Chelsea', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/chelsea-home.webp', badge: 'NEW',
    blurb: 'Chelsea away kit for 26/27 — fresh colourway, same Blue Lion heart.' },
  { slug: 'liverpool-home-26-27', teamName: 'Liverpool', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: '/images/products/liverpool-home.webp', badge: 'NEW', featured: true,
    blurb: 'You’ll Never Walk Alone in red. The 26/27 Liverpool home shirt with the classic Anfield look — bold, bright and built to last.' },
  { slug: 'liverpool-away-26-27', teamName: 'Liverpool', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/liverpool-home.webp', badge: 'NEW',
    blurb: 'Liverpool away shirt for 26/27 — the travelling Reds’ colours, sharp enough for matchday or class.' },
  { slug: 'liverpool-third-26-27', name: 'Liverpool Third Kit 26/27', teamName: 'Liverpool', season: '26/27', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/liverpool-third-26-27.jpg', badge: 'NEW',
    blurb: 'The 26/27 Liverpool third kit — the shirt for Reds who already own the home and away one and still want more. Standout colourway, stand-out fit.' },
  { slug: 'man-city-home-26-27', teamName: 'Manchester City', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 30999, image: '/images/products/mancity-home.webp', badge: 'NEW', featured: true,
    blurb: 'Sky Blue royalty. The 26/27 Man City home shirt — the colours of the Pep era, now on the streets of Malete.' },
  { slug: 'man-city-away-26-27', teamName: 'Manchester City', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 28950, image: '/images/products/mancity-home.webp', badge: 'NEW',
    blurb: 'Manchester City 26/27 away kit — a fresh look for the reigning force of English football.' },
  { slug: 'man-city-third-26-27', name: 'Manchester City Third Kit 26/27', teamName: 'Manchester City', season: '26/27', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/mancity-home.webp', badge: 'NEW',
    blurb: 'The 26/27 City third kit — the alternative colours for Citizens who like the road less travelled.' },
  { slug: 'man-utd-home-26-27', teamName: 'Manchester United', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/manutd-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'The Red Devils’ 26/27 home shirt — theatre, tradition and that famous crest. A campus classic every season.' },
  { slug: 'man-utd-retro-02-03', name: 'Manchester United 02/03 Away Retro Jersey', teamName: 'Manchester United', season: '02/03', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 28950, image: '/images/products/manutd-home.webp',
    blurb: 'The treble-era gold away shirt from 02/03 — the one Beckham and van Nistelrooy made famous. A retro flex that never goes out of style.' },
  { slug: 'tottenham-home-25-26', teamName: 'Tottenham Hotspur', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: null,
    blurb: 'To Dare Is To Do. The Spurs 25/26 home shirt — for the north London loyalist in Malete.' },
  { slug: 'ac-milan-home-26-27', teamName: 'AC Milan', season: '26/27', kitType: 'HOME', league: 'Serie A', categoryType: 'CLUB', price: 24999, image: '/images/products/acmilan-home.webp', badge: 'NEW',
    blurb: 'Rossoneri red and black for 26/27. For the Milanista who knows style is non-negotiable.' },
  { slug: 'inter-home-26-27', teamName: 'Inter Milan', season: '26/27', kitType: 'HOME', league: 'Serie A', categoryType: 'CLUB', price: 24999, image: '/images/products/inter-home.webp', badge: 'NEW',
    blurb: 'The Nerazzurri stripes never miss. Inter’s 26/27 home shirt — timeless Milanese design.' },
  { slug: 'bayern-home-26-27', teamName: 'Bayern Munich', season: '26/27', kitType: 'HOME', league: 'Bundesliga', categoryType: 'CLUB', price: 24999, image: '/images/products/bayern-home.webp', badge: 'NEW',
    blurb: 'Mia san mia. Bayern’s 26/27 home shirt in classic red — Bavarian power, Bundesliga standard.' },
  { slug: 'dortmund-home-26-27', teamName: 'Borussia Dortmund', season: '26/27', kitType: 'HOME', league: 'Bundesliga', categoryType: 'CLUB', price: 24999, image: null, badge: 'NEW',
    blurb: 'Echte Liebe. The Yellow Wall’s colours for 26/27 — loud as the Signal Iduna Park, bright as Malete midday.' },
  { slug: 'psg-home-26-27', teamName: 'Paris Saint-Germain', season: '26/27', kitType: 'HOME', league: 'Ligue 1', categoryType: 'CLUB', price: 24999, image: '/images/products/psg-home.webp', badge: 'NEW',
    blurb: 'Ici c’est Paris. The 26/27 PSG home shirt — navy with the signature red stripe, Parisian style for KWASU streets.' },
  // ---------- NATIONAL TEAMS ----------
  { slug: 'nigeria-stadium-home-26-27', name: 'Nigeria Stadium Home Jersey 26/27', teamName: 'Nigeria', season: '26/27', kitType: 'HOME', league: 'Super Eagles', categoryType: 'NATIONAL', price: 26999, image: '/images/products/nigeria-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'UP SUPER EAGLES! The green-and-white of Nigeria for 26/27 — the stadium edition fans wear on matchday. The most patriotic shirt in Malete.' },
  { slug: 'argentina-messi-26-27', name: 'Argentina Messi Home Jersey 26/27', teamName: 'Argentina', season: '26/27', kitType: 'HOME', league: 'World Champions', categoryType: 'NATIONAL', price: 28999, image: '/images/products/argentina-messi-26-27.jpg', badge: 'BESTSELLER', featured: true,
    blurb: 'Albiceleste stripes with champions’ energy — Messi’s colours, three stars on the chest. The number 10 is already waiting for you.' },
  { slug: 'brazil-retro-2024', name: 'Brazil 2024 Home Retro Jersey', teamName: 'Brazil', season: '2024', kitType: 'HOME', league: 'Seleção', categoryType: 'NATIONAL', price: 28999, image: '/images/products/brazil-home.webp',
    blurb: 'O amarelinho! The classic canary yellow of Brazil in the 2024 retro cut — five stars, endless flair. Joga bonito in Malete.' },
  { slug: 'england-home-26-27', teamName: 'England', season: '26/27', kitType: 'HOME', league: 'Three Lions', categoryType: 'NATIONAL', price: 24999, image: '/images/products/england-home.webp', badge: 'NEW',
    blurb: 'The Three Lions’ classic white for 26/27. It’s coming home — or at least it’s coming to Malete.' },
  { slug: 'england-away-26-27', teamName: 'England', season: '26/27', kitType: 'AWAY', league: 'Three Lions', categoryType: 'NATIONAL', price: 24999, image: '/images/products/england-home.webp', badge: 'NEW',
    blurb: 'England’s 26/27 away colours — the away-day edition for Three Lions faithful.' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

function description(seed: ProductSeed): string {
  if (seed.desc) return seed.desc
  const kitWord = seed.kitType === 'HOME' ? 'home shirt' : seed.kitType === 'AWAY' ? 'away shirt' : 'third kit'
  return `${seed.blurb}\n\nQuality fan-version replica in breathable polyester that survives Nigerian washing machines. True-to-size regular fit. Official-style team crest and brand details.\n\nWant the full matchday feel? Upgrade to Player Version for the exact fit and tech the pros wear, or add customisation — your name and favourite number printed in the official font.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.` }

async function main() {
  console.log('Seeding MALÈTE KITS…')

  // 1) Admin user -------------------------------------------------------------
  // The password comes from ADMIN_PASSWORD. Re-seeding WITH it set rotates an
  // existing admin's password; seeding WITHOUT it never installs a known
  // default — a fresh account gets a random password, printed once below.
  const adminEmail = (process.env.ADMIN_EMAIL || 'owner@maletekits.com').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(12).toString('hex')
  const existingAdmin = await db.adminUser.findUnique({ where: { email: adminEmail } })
  const admin = await db.adminUser.upsert({
    where: { email: adminEmail },
    update: process.env.ADMIN_PASSWORD ? { passwordHash: hashPassword(adminPassword) } : {},
    create: {
      email: adminEmail,
      name: 'Store Owner',
      role: 'OWNER',
      passwordHash: hashPassword(adminPassword),
    },
  })
  if (process.env.ADMIN_PASSWORD) {
    console.log(`✓ Admin user: ${adminEmail} (password from ADMIN_PASSWORD env)`)
  } else if (existingAdmin) {
    console.log(`✓ Admin user: ${adminEmail} (existing password untouched — rotate with scripts/rotate-admin-password.sh)`)
  } else {
    console.log(`✓ Admin user: ${adminEmail} created with a RANDOM password (shown once — store it now): ${adminPassword}`)
  }

  // 2) Store settings ----------------------------------------------------------
  // One-time PRODUCTION overrides — passed as env vars only when seeding a fresh
  // production database (keeps real store identity OUT of the repository).
  // Local dev runs without them and keeps the placeholders below.
  const bankName = process.env.SEED_BANK_NAME || null
  const accountName = process.env.SEED_ACCOUNT_NAME || null
  const accountNumber = process.env.SEED_ACCOUNT_NUMBER || null
  const hasBank = !!(bankName && accountName && accountNumber)
  const settings = await db.storeSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      // Starts EMPTY on purpose: a placeholder number would send customers to a
      // stranger's WhatsApp. Storefront WhatsApp links stay hidden while this is
      // empty; the owner sets the real number in Admin → Settings (080… local
      // format is normalized to international 234… automatically on save).
      whatsappNumber: process.env.SEED_WHATSAPP_NUMBER || process.env.OWNER_WHATSAPP_NUMBER || '',
      supportEmail: process.env.SEED_SUPPORT_EMAIL || 'hello@maletekits.com',
      storeAddress: 'KWASU Main Campus Area, Malete, Kwara State',
      openingHours: 'Mon–Sat, 9:00am – 8:00pm',
      announcement: 'New-season 25/26 jerseys now available — order today, pick up in Malete!',
      bankName,
      accountName,
      accountNumber,
      acceptedPaymentMethods: process.env.SEED_PAYMENT_METHODS || (hasBank ? 'Bank transfer · Cash on pickup or delivery' : 'Bank transfer, Cash on confirmation'),
      cashInstructions: hasBank
        ? 'Pay cash at pickup or on delivery. You will receive a confirmation receipt.'
        : 'Cash payments are collected on pickup/delivery in Malete. Always collect a receipt.',
      paymentInstructions: hasBank
        ? `Transfer the exact total to the ${bankName} account — ${accountName}, ${accountNumber}. We verify every payment personally before your order is marked PAID — keep your transfer reference. Send your payment ONLY after we confirm availability.`
        : 'Pay only AFTER the owner confirms your order. Send your receipt on WhatsApp for verification.',
      deliveryFeeMalete: 1000,
      deliveryFeeOther: 2500,
      customizationFee: 2000,
      pickupFee: 0,
      promoCode: 'KWASU10',
      promoPercent: 10,
      promoMaxNaira: 2000,
    },
  })
  console.log(hasBank ? `✓ Store settings (bank details seeded: ${bankName})` : '✓ Store settings (bank details intentionally EMPTY — configure in Admin → Settings)')

  // 3) Order counter (first order will be MK-1024) ------------------------------
  await db.counter.upsert({
    where: { id: 'ORDER' },
    update: {},
    create: { id: 'ORDER', value: 1023 },
  })
  console.log('✓ Order counter (next number → MK-1024)')

  // 4) Categories ---------------------------------------------------------------
  const clubCat = await db.category.upsert({
    where: { slug: 'club-teams' },
    update: { name: 'Club Teams', type: 'CLUB' },
    create: { slug: 'club-teams', name: 'Club Teams', type: 'CLUB', sortOrder: 1 },
  })
  const nationalCat = await db.category.upsert({
    where: { slug: 'national-teams' },
    update: { name: 'National Teams', type: 'NATIONAL' },
    create: { slug: 'national-teams', name: 'National Teams', type: 'NATIONAL', sortOrder: 2 },
  })
  console.log('✓ Categories')

  // 5) Products + variants -------------------------------------------------------
  let variantCount = 0
  let productIndex = 0
  for (const seed of PRODUCTS) {
    productIndex++
    const displayName = seed.name
      ?? `${seed.teamName} ${seed.kitType === 'THIRD' ? 'Third Kit' : seed.kitType === 'HOME' ? 'Home Shirt' : 'Away Shirt'} ${seed.season}`
    const product = await db.product.upsert({
      where: { slug: seed.slug },
      update: {
        name: displayName,
        basePrice: seed.price,
        imageUrl: seed.image,
        badge: seed.badge ?? null,
        featured: seed.featured ?? false,
        league: seed.league,
      },
      create: {
        slug: seed.slug,
        name: displayName,
        teamName: seed.teamName,
        season: seed.season,
        kitType: seed.kitType,
        league: seed.league,
        categoryId: seed.categoryType === 'CLUB' ? clubCat.id : nationalCat.id,
        description: description(seed),
        basePrice: seed.price,
        playerVersionAdj: 4500,
        customizationAvailable: true,
        badge: seed.badge ?? null,
        featured: seed.featured ?? false,
        imageUrl: seed.image,
      },
    })

    for (let i = 0; i < SIZES.length; i++) {
      const size = SIZES[i]
      const sku = `MK-${seed.slug.toUpperCase()}-${size}`
      const existing = await db.productVariant.findUnique({ where: { sku } })
      const stock = existing ? existing.stock : stockFor(productIndex + i)
      await db.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          size,
          sku,
          stock,
        },
      })
      if (!existing) {
        await db.inventoryLog.create({
          data: { variantId: (await db.productVariant.findUnique({ where: { sku } }))!.id, delta: stock, reason: 'SEED', note: 'Initial stock' },
        })
        variantCount++
      }
    }
  }
  console.log(`✓ ${PRODUCTS.length} products seeded (variants upserted; ${variantCount} new)`)

  // 5b) Retire off-catalog products ---------------------------------------------
  // The catalog mirrors mysportskit.com.ng. Products seeded earlier that are no
  // longer in PRODUCTS are DEACTIVATED, never deleted, so historical orders
  // keep their line items.
  const catalogSlugs = new Set(PRODUCTS.map((p) => p.slug))
  const all = await db.product.findMany({ select: { id: true, slug: true, active: true } })
  const offCatalog = all.filter((p) => !catalogSlugs.has(p.slug) && p.active)
  if (offCatalog.length) {
    await db.product.updateMany({ where: { id: { in: offCatalog.map((p) => p.id) } }, data: { active: false } })
    console.log(`✓ Deactivated ${offCatalog.length} off-catalog products: ${offCatalog.map((p) => p.slug).join(', ')}`)
  } else {
    console.log('✓ No off-catalog products to deactivate')
  }

  console.log('\nSEED COMPLETE')
  console.log(`  Admin login: ${adminEmail}`)
  console.log(`  Admin password: ${process.env.ADMIN_PASSWORD ? '(from ADMIN_PASSWORD env)' : existingAdmin ? '(unchanged — rotate with scripts/rotate-admin-password.sh)' : '(random — see the admin line above)'}`)
  console.log(`  Promo code: ${settings.promoCode} (${settings.promoPercent}% off, max ₦${settings.promoMaxNaira})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
