// ---------------------------------------------------------------------------
// MALÈTE KITS — seed data
// Run: bun prisma/seed.ts   (idempotent — safe to re-run)
//
// NOTE: No bank account details are seeded. The store owner must configure
// payment details in the admin dashboard (Settings) — we never invent them.
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'
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
  teamName: string
  season: string
  kitType: 'HOME' | 'AWAY' | 'THIRD'
  league: string
  categoryType: 'CLUB' | 'NATIONAL'
  price: number
  image: string | null
  badge?: string
  featured?: boolean
  blurb: string
}

const PRODUCTS: ProductSeed[] = [
  // ---------- CLUB TEAMS ----------
  { slug: 'real-madrid-home-25-26', teamName: 'Real Madrid', season: '25/26', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 12000, image: '/images/products/realmadrid-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'Los Blancos never go out of style. The 25/26 Real Madrid home shirt keeps the iconic all-white look with gold accents — the same energy as the Bernabéu on a UCL night. Lightweight, breathable and perfect for Malete heat.' },
  { slug: 'real-madrid-away-25-26', teamName: 'Real Madrid', season: '25/26', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 11500, image: '/images/products/realmadrid-home.webp',
    blurb: 'The Real Madrid away shirt for 25/26 — a clean, modern take on the Merengues travel colours. Subtle, sharp and instantly recognisable on campus.' },
  { slug: 'barcelona-home-25-26', teamName: 'FC Barcelona', season: '25/26', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 12000, image: '/images/products/barcelona-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'Blaugrana pride in its purest form. The 25/26 Barça home shirt carries the legendary stripes with a fresh modern collar. For every culer in KWASU — Més que un club.' },
  { slug: 'barcelona-away-25-26', teamName: 'FC Barcelona', season: '25/26', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 11000, image: '/images/products/barcelona-home.webp',
    blurb: 'Barcelona away colours for 25/26 — clean, bold and built for away-day energy. Stand out from the usual home-shirt crowd.' },
  { slug: 'arsenal-home-25-26', teamName: 'Arsenal', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 11500, image: '/images/products/arsenal-home.webp', featured: true,
    blurb: 'The Gunners’ classic red and white for 25/26. North London standard, Malete approved. COYG!' },
  { slug: 'arsenal-away-25-26', teamName: 'Arsenal', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 11000, image: '/images/products/arsenal-home.webp',
    blurb: 'Arsenal’s 25/26 away shirt — sleek, dark and deadly, just like their counter-attacks.' },
  { slug: 'chelsea-home-25-26', teamName: 'Chelsea', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 11000, image: '/images/products/chelsea-home.webp', featured: true,
    blurb: 'Blues forever. The 25/26 Chelsea home shirt in royal blue with clean white detailing — a staple for any Stamford Bridge faithful.' },
  { slug: 'chelsea-away-25-26', teamName: 'Chelsea', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 10500, image: '/images/products/chelsea-home.webp',
    blurb: 'Chelsea away kit for 25/26 — fresh colourway, same Blue Lion heart.' },
  { slug: 'liverpool-home-25-26', teamName: 'Liverpool', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 11500, image: '/images/products/liverpool-home.webp',
    blurb: 'You’ll Never Walk Alone in red. The 25/26 Liverpool home shirt with the classic Anfield look — bold, bright and built to last.' },
  { slug: 'liverpool-away-25-26', teamName: 'Liverpool', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 11000, image: '/images/products/liverpool-home.webp',
    blurb: 'Liverpool away shirt for 25/26 — the travelling Reds’ colours, sharp enough for matchday or class.' },
  { slug: 'man-city-home-25-26', teamName: 'Manchester City', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 12000, image: '/images/products/mancity-home.webp',
    blurb: 'Sky Blue royalty. The 25/26 Man City home shirt — the colours of the Pep era, now on the streets of Malete.' },
  { slug: 'man-city-away-25-26', teamName: 'Manchester City', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 11000, image: '/images/products/mancity-home.webp',
    blurb: 'Manchester City 25/26 away kit — a fresh look for the reigning force of English football.' },
  { slug: 'man-utd-home-25-26', teamName: 'Manchester United', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 11500, image: '/images/products/manutd-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'The Red Devils’ 25/26 home shirt — theatre, tradition and that famous crest. A campus classic every season.' },
  { slug: 'man-utd-away-25-26', teamName: 'Manchester United', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 10500, image: '/images/products/manutd-home.webp',
    blurb: 'Manchester United away colours for 25/26 — clean design for Reds who like it low-key.' },
  { slug: 'psg-home-25-26', teamName: 'Paris Saint-Germain', season: '25/26', kitType: 'HOME', league: 'Ligue 1', categoryType: 'CLUB', price: 12000, image: '/images/products/psg-home.webp',
    blurb: 'Ici c’est Paris. The 25/26 PSG home shirt — navy with the signature red stripe, Parisian style for KWASU streets.' },
  { slug: 'bayern-home-25-26', teamName: 'Bayern Munich', season: '25/26', kitType: 'HOME', league: 'Bundesliga', categoryType: 'CLUB', price: 11500, image: '/images/products/bayern-home.webp',
    blurb: 'Mia san mia. Bayern’s 25/26 home shirt in classic red — Bavarian power, Bundesliga standard.' },
  { slug: 'inter-home-25-26', teamName: 'Inter Milan', season: '25/26', kitType: 'HOME', league: 'Serie A', categoryType: 'CLUB', price: 11000, image: '/images/products/inter-home.webp',
    blurb: 'The Nerazzurri stripes never miss. Inter’s 25/26 home shirt — timeless Milanese design.' },
  { slug: 'ac-milan-home-25-26', teamName: 'AC Milan', season: '25/26', kitType: 'HOME', league: 'Serie A', categoryType: 'CLUB', price: 11000, image: '/images/products/acmilan-home.webp',
    blurb: 'Rossoneri red and black for 25/26. For the Milanista who knows style is non-negotiable.' },
  { slug: 'al-nassr-home-25-26', teamName: 'Al Nassr', season: '25/26', kitType: 'HOME', league: 'Saudi Pro League', categoryType: 'CLUB', price: 10000, image: '/images/products/alnassr-home.webp', featured: true,
    blurb: 'SIUUU! The Al Nassr home shirt — CR7’s club colours in yellow and blue. One of the most requested shirts in Malete.' },
  // ---------- NATIONAL TEAMS ----------
  { slug: 'nigeria-home-25-26', teamName: 'Nigeria', season: '25/26', kitType: 'HOME', league: 'Super Eagles', categoryType: 'NATIONAL', price: 10000, image: '/images/products/nigeria-home.webp', badge: 'BESTSELLER', featured: true,
    blurb: 'UP SUPER EAGLES! The green-and-white of Nigeria for 25/26. Rep your country on campus — the most patriotic shirt in Malete.' },
  { slug: 'nigeria-away-25-26', teamName: 'Nigeria', season: '25/26', kitType: 'AWAY', league: 'Super Eagles', categoryType: 'NATIONAL', price: 10000, image: '/images/products/nigeria-home.webp',
    blurb: 'The Super Eagles away shirt for 25/26 — a fresh design for away fixtures and everyday flex.' },
  { slug: 'argentina-home-25-26', teamName: 'Argentina', season: '25/26', kitType: 'HOME', league: 'World Champions', categoryType: 'NATIONAL', price: 12000, image: '/images/products/argentina-home.webp', featured: true,
    blurb: 'Albiceleste stripes with champions’ energy. The Argentina home shirt — Messi’s colours, three stars on the chest.' },
  { slug: 'portugal-home-25-26', teamName: 'Portugal', season: '25/26', kitType: 'HOME', league: 'Seleção das Quinas', categoryType: 'NATIONAL', price: 12000, image: '/images/products/portugal-home.webp', featured: true,
    blurb: 'Deep red with the iconic crest — Portugal’s 25/26 home shirt. For CR7 fans who already own the Al Nassr one.' },
  { slug: 'brazil-home-25-26', teamName: 'Brazil', season: '25/26', kitType: 'HOME', league: 'Seleção', categoryType: 'NATIONAL', price: 11500, image: '/images/products/brazil-home.webp',
    blurb: 'O amarelinho! The classic canary yellow of Brazil — five stars, endless flair. Joga bonito in Malete.' },
  { slug: 'england-home-25-26', teamName: 'England', season: '25/26', kitType: 'HOME', league: 'Three Lions', categoryType: 'NATIONAL', price: 11500, image: '/images/products/england-home.webp',
    blurb: 'The Three Lions’ classic white for 25/26. It’s coming home — or at least it’s coming to Malete.' },
  { slug: 'france-home-25-26', teamName: 'France', season: '25/26', kitType: 'HOME', league: 'Les Bleus', categoryType: 'NATIONAL', price: 12000, image: '/images/products/france-home.webp',
    blurb: 'Les Bleus navy for 25/26 — world-champion style, two stars and a golden rooster.' },
  { slug: 'spain-home-25-26', teamName: 'Spain', season: '25/26', kitType: 'HOME', league: 'La Roja', categoryType: 'NATIONAL', price: 11500, image: '/images/products/spain-home.webp',
    blurb: 'La Roja red for 25/26 — European champions’ colours with that unmistakable Spanish flair.' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

function description(seed: ProductSeed): string {
  const kitWord = seed.kitType === 'HOME' ? 'home shirt' : seed.kitType === 'AWAY' ? 'away shirt' : 'third kit'
  return `${seed.blurb}\n\nQuality fan-version replica in breathable polyester that survives Nigerian washing machines. True-to-size regular fit. Official-style team crest and brand details.\n\nWant the full matchday feel? Upgrade to Player Version for the exact fit and tech the pros wear, or add customisation — your name and favourite number printed in the official font.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.` }

async function main() {
  console.log('Seeding MALÈTE KITS…')

  // 1) Admin user -------------------------------------------------------------
  const adminEmail = (process.env.ADMIN_EMAIL || 'owner@maletekits.com').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || 'MaleteAdmin@2026!'
  const admin = await db.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Store Owner',
      role: 'OWNER',
      passwordHash: hashPassword(adminPassword),
    },
  })
  console.log(`✓ Admin user: ${adminEmail} ${process.env.ADMIN_PASSWORD ? '(password from ADMIN_PASSWORD env)' : '(default password — see README, change after first login)'}`)

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
      whatsappNumber: process.env.SEED_WHATSAPP_NUMBER || process.env.OWNER_WHATSAPP_NUMBER || '08012345678', // PLACEHOLDER — owner must update in Admin → Settings
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
    const product = await db.product.upsert({
      where: { slug: seed.slug },
      update: {
        basePrice: seed.price,
        imageUrl: seed.image,
        badge: seed.badge ?? null,
        featured: seed.featured ?? false,
        league: seed.league,
      },
      create: {
        slug: seed.slug,
        name: `${seed.teamName} ${seed.kitType === 'THIRD' ? 'Third Kit' : seed.kitType === 'HOME' ? 'Home Shirt' : 'Away Shirt'} ${seed.season}`,
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

  console.log('\nSEED COMPLETE')
  console.log(`  Admin login: ${adminEmail}`)
  console.log(`  Admin password: ${process.env.ADMIN_PASSWORD ? '(from env)' : 'MaleteAdmin@2026! — CHANGE THIS AFTER FIRST LOGIN'}`)
  console.log(`  Promo code: ${settings.promoCode} (${settings.promoPercent}% off, max ₦${settings.promoMaxNaira})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
