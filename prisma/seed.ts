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
// CATALOG — mirrors mysportskit.com.ng jerseys and prices (captured 9 Nov 2026 from their listings, product pages and indexed snippets; prices checked in scripts/verify-prices.py)..
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

  // ---------- CLUB TEAMS — Nov 2026 catalog expansion ----------
  { slug: 'arsenal-2026-27-third-kits-female-jersey', name: 'Arsenal 2026/27 Third Kits Female Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/arsenal-2026-27-third-kits-female-jersey.jpg',
    blurb: 'The Arsenal third shirt cut for the female fan — same colours, same badge, a fit that actually fits. North London standard, Malete approved.' },
  { slug: 'barcelona-home-long-sleeve-2026-27-jersey', name: 'Barcelona Home Long Sleeve 2026/27 Jersey', teamName: 'FC Barcelona', season: '26/27', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 35950, image: '/images/products/barcelona-home-long-sleeve-2026-27-jersey.jpg',
    blurb: 'Long-sleeve edition of the FC Barcelona home shirt — for cold Harmattan mornings and defenders who slide. Més que un club.' },
  { slug: 'liverpool-home-kids-2026-2027-jersey', name: 'Liverpool Home Kids 2026-2027 Jersey', teamName: 'Liverpool', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24950, image: '/images/products/liverpool-home-kids-2026-2027-jersey.jpg',
    blurb: 'The Liverpool home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. You’ll Never Walk Alone.' },
  { slug: '1997-98-newcastle-away-retro-jersey', name: '1997-98 Newcastle Away Retro Jersey', teamName: 'Newcastle United', season: '97/98', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 35999, image: null,
    blurb: 'A cult classic reborn. For every Newcastle United fan in Malete.' },
  { slug: 'ac-milan-authentic-away-2025-2026-jersey', name: 'AC Milan Authentic Away 2025/2026 Jersey', teamName: 'AC Milan', season: '25/26', kitType: 'AWAY', league: 'Serie A', categoryType: 'CLUB', price: 22999, image: '/images/products/acmilan-home.webp',
    desc: 'The AUTHENTIC (player-spec) AC Milan away shirt 25/26 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'ajax-amsterdam-25-25-third-kits-jersey', teamName: 'Ajax', season: '25/26', kitType: 'THIRD', league: 'Eredivisie', categoryType: 'CLUB', price: 32999, image: null,
    blurb: 'For every Ajax fan in Malete.' },
  { slug: 'al-nassr-2026-2027-home-kids-jersey', name: 'Al-Nassr 2026/2027 Home Kids Jersey', teamName: 'Al Nassr', season: '26/27', kitType: 'HOME', league: 'Saudi Pro League', categoryType: 'CLUB', price: 24999, image: '/images/products/alnassr-home.webp',
    blurb: 'The Al Nassr home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. For every Al Nassr fan in Malete.' },
  { slug: 'arsenal-2025-26-away-jersey', teamName: 'Arsenal', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 27999, image: '/images/products/arsenal-home.webp',
    blurb: 'North London standard, Malete approved.' },
  { slug: 'arsenal-2025-26-kids-home-jersey', name: 'Arsenal 2025/26 Kids Home Jersey', teamName: 'Arsenal', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 25999, image: '/images/products/arsenal-home.webp',
    blurb: 'The Arsenal home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. North London standard, Malete approved.' },
  { slug: 'arsenal-2026-27-away-female-jersey', name: 'Arsenal 2026/27 Away Female Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 31999, image: '/images/products/arsenal-home.webp',
    blurb: 'The Arsenal away shirt cut for the female fan — same colours, same badge, a fit that actually fits. North London standard, Malete approved.' },
  { slug: 'arsenal-2026-27-home-female-jersey', name: 'Arsenal 2026/27 Home Female Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/arsenal-home.webp',
    blurb: 'The Arsenal home shirt cut for the female fan — same colours, same badge, a fit that actually fits. North London standard, Malete approved.' },
  { slug: 'arsenal-2026-27-kids-away-jersey', name: 'Arsenal 2026/27 Kids Away Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 26999, image: '/images/products/arsenal-home.webp',
    blurb: 'The Arsenal away shirt sized for the young ones — same colours, same badge, built for schoolyard matches. North London standard, Malete approved.' },
  { slug: 'arsenal-2026-27-kids-home-jersey', name: 'Arsenal 2026/27 Kids Home Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/arsenal-home.webp',
    blurb: 'The Arsenal home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. North London standard, Malete approved.' },
  { slug: 'arsenal-authentic-2025-2026-third-jersey', name: 'Arsenal Authentic 2025/2026 Third Jersey', teamName: 'Arsenal', season: '25/26', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 35999, image: '/images/products/arsenal-home.webp',
    desc: 'The AUTHENTIC (player-spec) Arsenal third shirt 25/26 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'arsenal-authentic-2026-2027-away-jersey', name: 'Arsenal Authentic 2026/2027 Away Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/arsenal-home.webp',
    desc: 'The AUTHENTIC (player-spec) Arsenal away shirt 26/27 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'arsenal-authentic-2026-2027-home-jersey', name: 'Arsenal Authentic 2026/2027 Home Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/arsenal-home.webp',
    desc: 'The AUTHENTIC (player-spec) Arsenal home shirt 26/27 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'arsenal-authentic-2026-2027-third-kits-longsleeve-jersey', name: 'Arsenal Authentic 2026/2027 Third Kits Longsleeve Jersey', teamName: 'Arsenal', season: '26/27', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: '/images/products/arsenal-home.webp',
    desc: 'The AUTHENTIC (player-spec) Arsenal third shirt 26/27 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'arsenal-terrace-icons-jersey', name: 'Arsenal Terrace Icons Jersey 26/27', teamName: 'Arsenal', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 22950, image: null,
    blurb: 'Terrace-icons heritage line — the shirt that never leaves rotation. North London standard, Malete approved.' },
  { slug: 'aston-villa-fc-2026-27-home-jersey', teamName: 'Aston Villa', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: null,
    blurb: 'For every Aston Villa fan in Malete.' },
  { slug: 'barcelona-away-2026-27-jersey', teamName: 'FC Barcelona', season: '26/27', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 28950, image: '/images/products/barcelona-home.webp',
    blurb: 'Més que un club.' },
  { slug: 'barcelona-home-authentic-2026-27-jersey', name: 'Barcelona Home Authentic 2026/27 Jersey', teamName: 'FC Barcelona', season: '26/27', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 24950, image: '/images/products/barcelona-home.webp',
    desc: 'The AUTHENTIC (player-spec) FC Barcelona home shirt 26/27 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'barcelona-kappa-blue-95-97-retro-jersey', name: 'Barcelona Kappa Blue 95/97 Retro Jersey 26/27', teamName: 'FC Barcelona', season: '26/27', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 24950, image: null,
    blurb: 'A cult classic reborn. Més que un club.' },
  { slug: 'barcelona-third-kits-2026-27-jersey', teamName: 'FC Barcelona', season: '26/27', kitType: 'THIRD', league: 'La Liga', categoryType: 'CLUB', price: 24999, image: '/images/products/barcelona-home.webp',
    blurb: 'Més que un club.' },
  { slug: 'bayern-munich-icon-1998-00-away-retro-jersey', name: 'Bayern Munich Icon 1998-00 Away Retro Jersey', teamName: 'Bayern Munich', season: '98/00', kitType: 'AWAY', league: 'Bundesliga', categoryType: 'CLUB', price: 25950, image: null,
    blurb: 'A cult classic reborn. Mia san mia.' },
  { slug: 'borussia-dortmund-2024-25-home-jersey', teamName: 'Borussia Dortmund', season: '24/25', kitType: 'HOME', league: 'Bundesliga', categoryType: 'CLUB', price: 26999, image: null,
    blurb: 'Echte Liebe — loud as the Yellow Wall.' },
  { slug: 'chelsea-away-2026-27-authentic-jersey', name: 'Chelsea Away 2026/27 Authentic Jersey', teamName: 'Chelsea', season: '26/27', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: '/images/products/chelsea-home.webp',
    desc: 'The AUTHENTIC (player-spec) Chelsea away shirt 26/27 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'chelsea-fc-2001-23-away-jersey', teamName: 'Chelsea', season: '01/23', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: '/images/products/chelsea-home.webp',
    blurb: 'Blue blood, Stamford Bridge standard.' },
  { slug: 'chelsea-home-2024-25-jersey', teamName: 'Chelsea', season: '24/25', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 18950, image: '/images/products/chelsea-home.webp',
    blurb: 'Blue blood, Stamford Bridge standard.' },
  { slug: 'chelsea-home-2025-26-authentic-jersey', name: 'Chelsea Home 2025/26 Authentic Jersey', teamName: 'Chelsea', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 38999, image: '/images/products/chelsea-home.webp',
    desc: 'The AUTHENTIC (player-spec) Chelsea home shirt 25/26 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'chelsea-home-2026-27-authentic-jersey', name: 'Chelsea Home 2026/27 Authentic Jersey', teamName: 'Chelsea', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 44999, image: '/images/products/chelsea-home.webp',
    desc: 'The AUTHENTIC (player-spec) Chelsea home shirt 26/27 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'chelsea-home-kids-2025-26-jersey', name: 'Chelsea Home Kids 2025/26 Jersey', teamName: 'Chelsea', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 29999, image: '/images/products/chelsea-home.webp',
    blurb: 'The Chelsea home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Blue blood, Stamford Bridge standard.' },
  { slug: 'chelsea-home-kids-2026-27-jersey', name: 'Chelsea Home Kids 2026/27 Jersey', teamName: 'Chelsea', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/chelsea-home.webp',
    blurb: 'The Chelsea home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Blue blood, Stamford Bridge standard.' },
  { slug: 'chelsea-third-kits-2026-27-jersey', teamName: 'Chelsea', season: '26/27', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 28950, image: '/images/products/chelsea-home.webp',
    blurb: 'Blue blood, Stamford Bridge standard.' },
  { slug: 'everton-fc-22-23-blue-home-jersey', teamName: 'Everton', season: '22/23', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: null,
    blurb: 'For every Everton fan in Malete.' },
  { slug: 'everton-fc-24-25-blue-home-jersey', teamName: 'Everton', season: '24/25', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: null,
    blurb: 'For every Everton fan in Malete.' },
  { slug: 'galatasaray-2025-2026-away-jersey', teamName: 'Galatasaray', season: '25/26', kitType: 'AWAY', league: 'Süper Lig', categoryType: 'CLUB', price: 24999, image: null,
    blurb: 'For every Galatasaray fan in Malete.' },
  { slug: 'galatasaray-2025-2026-home-jersey', teamName: 'Galatasaray', season: '25/26', kitType: 'HOME', league: 'Süper Lig', categoryType: 'CLUB', price: 28999, image: null,
    blurb: 'For every Galatasaray fan in Malete.' },
  { slug: 'inter-miami-cf-third-kits-2026-2027-jersey', teamName: 'Inter Miami', season: '26/27', kitType: 'THIRD', league: 'MLS', categoryType: 'CLUB', price: 34999, image: null,
    blurb: 'For every Inter Miami fan in Malete.' },
  { slug: 'inter-milan-2025-26-home-jersey', teamName: 'Inter Milan', season: '25/26', kitType: 'HOME', league: 'Serie A', categoryType: 'CLUB', price: 30950, image: '/images/products/inter-home.webp',
    blurb: 'The Nerazzurri stripes never miss.' },
  { slug: 'juventus-2023-24-home-jersey', teamName: 'Juventus', season: '23/24', kitType: 'HOME', league: 'Serie A', categoryType: 'CLUB', price: 24999, image: null,
    blurb: 'For every Juventus fan in Malete.' },
  { slug: 'juventus-2026-27-away-jersey', teamName: 'Juventus', season: '26/27', kitType: 'AWAY', league: 'Serie A', categoryType: 'CLUB', price: 24999, image: null,
    blurb: 'For every Juventus fan in Malete.' },
  { slug: 'juventus-2026-27-home-jersey', teamName: 'Juventus', season: '26/27', kitType: 'HOME', league: 'Serie A', categoryType: 'CLUB', price: 24999, image: null,
    blurb: 'For every Juventus fan in Malete.' },
  { slug: 'liverpool-2023-24-away-mini-kit-kids', name: 'Liverpool 2023/24 Away Mini Kit (Kids)', teamName: 'Liverpool', season: '23/24', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/liverpool-home.webp',
    blurb: 'The Liverpool away shirt sized for the young ones — same colours, same badge, built for schoolyard matches. You’ll Never Walk Alone.' },
  { slug: 'liverpool-authentic-away-2025-2026-jersey', name: 'Liverpool Authentic Away 2025-2026 Jersey', teamName: 'Liverpool', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 27999, image: '/images/products/liverpool-home.webp',
    desc: 'The AUTHENTIC (player-spec) Liverpool away shirt 25/26 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'liverpool-authentic-home-2025-2026-jersey', name: 'Liverpool Authentic Home 2025-2026 Jersey', teamName: 'Liverpool', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 17450, image: '/images/products/liverpool-home.webp',
    desc: 'The AUTHENTIC (player-spec) Liverpool home shirt 25/26 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'liverpool-authentic-third-kits-2025-2026-jersey', name: 'Liverpool Authentic Third Kits 2025-2026 Jersey', teamName: 'Liverpool', season: '25/26', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 39399, image: '/images/products/liverpool-home.webp',
    desc: 'The AUTHENTIC (player-spec) Liverpool third shirt 25/26 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'liverpool-home-2025-2026-jersey', teamName: 'Liverpool', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 22950, image: '/images/products/liverpool-home.webp',
    blurb: 'You’ll Never Walk Alone.' },
  { slug: 'liverpool-home-kids-2025-2026-jersey', name: 'Liverpool Home Kids 2025-2026 Jersey', teamName: 'Liverpool', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 22950, image: '/images/products/liverpool-home.webp',
    blurb: 'The Liverpool home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. You’ll Never Walk Alone.' },
  { slug: 'manchester-city-2024-2025-home-jersey', teamName: 'Manchester City', season: '24/25', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24950, image: '/images/products/mancity-home.webp',
    blurb: 'Sky Blue royalty.' },
  { slug: 'manchester-city-2025-2026-away-jersey', teamName: 'Manchester City', season: '25/26', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/mancity-home.webp',
    blurb: 'Sky Blue royalty.' },
  { slug: 'manchester-city-2025-2026-home-jersey', teamName: 'Manchester City', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/mancity-home.webp',
    blurb: 'Sky Blue royalty.' },
  { slug: 'manchester-city-2025-2026-home-kids-jersey', name: 'Manchester City 2025/2026 Home Kids Jersey', teamName: 'Manchester City', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/mancity-home.webp',
    blurb: 'The Manchester City home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Sky Blue royalty.' },
  { slug: 'manchester-city-2026-2027-home-kids-jersey', name: 'Manchester City 2026/2027 Home Kids Jersey', teamName: 'Manchester City', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/mancity-home.webp',
    blurb: 'The Manchester City home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Sky Blue royalty.' },
  { slug: 'manchester-united-2007-08-retro-jersey', name: 'Manchester United 2007/08 Retro Jersey', teamName: 'Manchester United', season: '07/08', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 26999, image: null,
    blurb: 'A cult classic reborn. Theatre, tradition and that famous crest.' },
  { slug: 'manchester-united-2002-2003-away-jersey', teamName: 'Manchester United', season: '02/03', kitType: 'AWAY', league: 'Premier League', categoryType: 'CLUB', price: 28950, image: '/images/products/manutd-home.webp',
    blurb: 'Theatre, tradition and that famous crest.' },
  { slug: 'manchester-united-2025-26-home-authentic-jersey', name: 'Manchester United 2025/26 Home Authentic Jersey', teamName: 'Manchester United', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 33499, image: '/images/products/manutd-home.webp',
    desc: 'The AUTHENTIC (player-spec) Manchester United home shirt 25/26 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'manchester-united-home-2025-2026-jersey', teamName: 'Manchester United', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 22999, image: '/images/products/manutd-home.webp',
    blurb: 'Theatre, tradition and that famous crest.' },
  { slug: 'manchester-united-home-2025-2026-kids-jersey', name: 'Manchester United Home 2025 /2026 Kids Jersey', teamName: 'Manchester United', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/manutd-home.webp',
    blurb: 'The Manchester United home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Theatre, tradition and that famous crest.' },
  { slug: 'manchester-united-home-2026-2027-kids-jersey', name: 'Manchester United Home 2026/2027 Kids Jersey', teamName: 'Manchester United', season: '26/27', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24950, image: '/images/products/manutd-home.webp',
    blurb: 'The Manchester United home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Theatre, tradition and that famous crest.' },
  { slug: 'manchester-united-home-kids-2024-2025-jersey', name: 'Manchester United Home Kids 2024 /2025 Jersey', teamName: 'Manchester United', season: '24/25', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/manutd-home.webp',
    blurb: 'The Manchester United home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Theatre, tradition and that famous crest.' },
  { slug: 'manchester-united-third-kits-2026-2027-jersey', teamName: 'Manchester United', season: '26/27', kitType: 'THIRD', league: 'Premier League', categoryType: 'CLUB', price: 24999, image: '/images/products/manutd-home.webp',
    blurb: 'Theatre, tradition and that famous crest.' },
  { slug: 'napoli-fc-23-24-away-jersey', teamName: 'Napoli', season: '23/24', kitType: 'AWAY', league: 'Serie A', categoryType: 'CLUB', price: 32499, image: null,
    blurb: 'For every Napoli fan in Malete.' },
  { slug: 'napoli-fc-24-25-away-jersey', teamName: 'Napoli', season: '24/25', kitType: 'AWAY', league: 'Serie A', categoryType: 'CLUB', price: 32499, image: null,
    blurb: 'For every Napoli fan in Malete.' },
  { slug: 'newcastle-united-2024-25-home-jersey', teamName: 'Newcastle United', season: '24/25', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 22999, image: null,
    blurb: 'For every Newcastle United fan in Malete.' },
  { slug: 'newcastle-united-2025-26-home-jersey', teamName: 'Newcastle United', season: '25/26', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 35950, image: null,
    blurb: 'For every Newcastle United fan in Malete.' },
  { slug: 'paris-saint-germain-home-kids-2026-2027-jersey', name: 'Paris Saint-Germain Home Kids 2026-2027 Jersey', teamName: 'Paris Saint-Germain', season: '26/27', kitType: 'HOME', league: 'Ligue 1', categoryType: 'CLUB', price: 24999, image: '/images/products/psg-home.webp',
    blurb: 'The Paris Saint-Germain home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Ici c’est Paris.' },
  { slug: 'real-madrid-2026-27-away-player-grade-jersey', name: 'Real Madrid 2026/27 Away Player Grade Jersey', teamName: 'Real Madrid', season: '26/27', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 27499, image: '/images/products/realmadrid-home.webp',
    blurb: 'The Real Madrid away shirt in Player Grade — the on-pitch spec fit and fabric. Slim cut; consider one size up. Los Blancos all the way.' },
  { slug: 'real-madrid-2026-27-away-player-grade-longsleeve-jersey', name: 'Real Madrid 2026/27 Away Player Grade Longsleeve Jersey', teamName: 'Real Madrid', season: '26/27', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 27499, image: '/images/products/realmadrid-home.webp',
    blurb: 'Long-sleeve edition of the Real Madrid away shirt — for cold Harmattan mornings and defenders who slide. Los Blancos all the way.' },
  { slug: 'real-madrid-2026-27-home-player-grade-jersey', name: 'Real Madrid 2026/27 Home Player Grade Jersey', teamName: 'Real Madrid', season: '26/27', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 37499, image: '/images/products/realmadrid-home.webp',
    blurb: 'The Real Madrid home shirt in Player Grade — the on-pitch spec fit and fabric. Slim cut; consider one size up. Los Blancos all the way.' },
  { slug: 'real-madrid-24-25-away-jersey', teamName: 'Real Madrid', season: '24/25', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 18950, image: '/images/products/realmadrid-home.webp',
    blurb: 'Los Blancos all the way.' },
  { slug: 'real-madrid-away-2025-2026-jersey', teamName: 'Real Madrid', season: '25/26', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 28999, image: '/images/products/realmadrid-home.webp',
    blurb: 'Los Blancos all the way.' },
  { slug: 'real-madrid-away-2025-2026-kids-jersey', name: 'Real Madrid Away 2025-2026 Kids Jersey', teamName: 'Real Madrid', season: '25/26', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 22950, image: '/images/products/realmadrid-home.webp',
    blurb: 'The Real Madrid away shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Los Blancos all the way.' },
  { slug: 'real-madrid-away-2026-2027-kids-jersey', name: 'Real Madrid Away 2026-2027 Kids Jersey', teamName: 'Real Madrid', season: '26/27', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 24950, image: '/images/products/real-madrid-away-2026-2027-kids-jersey.jpg',
    blurb: 'The Real Madrid away shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Los Blancos all the way.' },
  { slug: 'real-madrid-home-2024-2025-jersey', teamName: 'Real Madrid', season: '24/25', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 28999, image: '/images/products/realmadrid-home.webp',
    blurb: 'Los Blancos all the way.' },
  { slug: 'real-madrid-home-2024-2025-kids-jersey', name: 'Real Madrid Home 2024-2025 Kids Jersey', teamName: 'Real Madrid', season: '24/25', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 22950, image: '/images/products/realmadrid-home.webp',
    blurb: 'The Real Madrid home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Los Blancos all the way.' },
  { slug: 'real-madrid-home-2025-2026-kids-jersey', name: 'Real Madrid Home 2025-2026 Kids Jersey', teamName: 'Real Madrid', season: '25/26', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 24999, image: '/images/products/realmadrid-home.webp',
    blurb: 'The Real Madrid home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Los Blancos all the way.' },
  { slug: 'real-madrid-home-2026-2027-kids-jersey', name: 'Real Madrid Home 2026-2027 Kids Jersey', teamName: 'Real Madrid', season: '26/27', kitType: 'HOME', league: 'La Liga', categoryType: 'CLUB', price: 24950, image: '/images/products/realmadrid-home.webp',
    blurb: 'The Real Madrid home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Los Blancos all the way.' },
  { slug: 'real-madrid-retro-purple-away-jersey', name: 'Real Madrid Retro Purple Away Jersey 26/27', teamName: 'Real Madrid', season: '26/27', kitType: 'AWAY', league: 'La Liga', categoryType: 'CLUB', price: 28950, image: null,
    blurb: 'A cult classic reborn. Los Blancos all the way.' },
  { slug: 'real-madrid-third-2024-2025-third-jersey', teamName: 'Real Madrid', season: '24/25', kitType: 'THIRD', league: 'La Liga', categoryType: 'CLUB', price: 22950, image: '/images/products/realmadrid-home.webp',
    blurb: 'Los Blancos all the way.' },
  { slug: 'real-madrid-third-kits-2025-2026-jersey', teamName: 'Real Madrid', season: '25/26', kitType: 'THIRD', league: 'La Liga', categoryType: 'CLUB', price: 22950, image: '/images/products/realmadrid-home.webp',
    blurb: 'Los Blancos all the way.' },
  { slug: 'tottenham-hotspur-1997-98-home-jersey', teamName: 'Tottenham Hotspur', season: '97/98', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 28999, image: null,
    blurb: 'To Dare Is To Do.' },
  { slug: 'west-ham-utd-24-25-home-jersey', teamName: 'West Ham United', season: '24/25', kitType: 'HOME', league: 'Premier League', categoryType: 'CLUB', price: 26999, image: null,
    blurb: 'For every West Ham United fan in Malete.' },
  { slug: 'juventus-2003-24-away-retro-jersey', name: 'Juventus 2003/24 Away Retro Jersey', teamName: 'Juventus', season: '03/24', kitType: 'AWAY', league: 'Serie A', categoryType: 'CLUB', price: 34950, image: null,
    blurb: 'A cult classic reborn. For every Juventus fan in Malete.' },
  // ---------- NATIONAL TEAMS — Nov 2026 catalog expansion ----------
  { slug: 'fifa-world-cup-26-argentina-lifestyle-collared-jersey', name: 'FIFA World Cup 26 Argentina Lifestyle Collared Jersey 26/27', teamName: 'Argentina', season: '26/27', kitType: 'HOME', league: 'World Champions', categoryType: 'NATIONAL', price: 100950, image: '/images/products/fifa-world-cup-26-argentina-lifestyle-collared-jersey.jpg',
    blurb: 'The Argentina lifestyle piece — collared, clean and matchday-adjacent. Three stars and Messi’s number 10 energy.' },
  { slug: 'argentina-away-world-cup-2026-jersey', teamName: 'Argentina', season: '2026', kitType: 'AWAY', league: 'World Champions', categoryType: 'NATIONAL', price: 24950, image: '/images/products/argentina-home.webp',
    blurb: 'Three stars and Messi’s number 10 energy.' },
  { slug: 'argentina-home-kids-world-cup-2026-jersey', name: 'Argentina Home Kids World Cup 2026 Jersey', teamName: 'Argentina', season: '2026', kitType: 'HOME', league: 'World Champions', categoryType: 'NATIONAL', price: 24999, image: '/images/products/argentina-home.webp',
    blurb: 'The Argentina home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. Three stars and Messi’s number 10 energy.' },
  { slug: 'argentina-home-world-cup-2026-authentic-jersey', name: 'Argentina Home World Cup 2026 Authentic Jersey', teamName: 'Argentina', season: '2026', kitType: 'HOME', league: 'World Champions', categoryType: 'NATIONAL', price: 44999, image: '/images/products/argentina-home.webp',
    desc: 'The AUTHENTIC (player-spec) Argentina home shirt 2026 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'argentina-home-world-cup-2026-jersey', teamName: 'Argentina', season: '2026', kitType: 'HOME', league: 'World Champions', categoryType: 'NATIONAL', price: 32950, image: '/images/products/argentina-home.webp',
    blurb: 'Three stars and Messi’s number 10 energy.' },
  { slug: 'brazil-2024-home-retro-soccer-jersey', teamName: 'Brazil', season: '2024', kitType: 'HOME', league: 'Seleção', categoryType: 'NATIONAL', price: 28999, image: '/images/products/brazil-home.webp',
    blurb: 'Joga bonito in the canary yellow.' },
  { slug: 'germany-away-1994-retro-jersey', name: 'Germany Away 1994 Retro Jersey', teamName: 'Germany', season: '1994', kitType: 'AWAY', league: 'Die Mannschaft', categoryType: 'NATIONAL', price: 98950, image: '/images/products/germany-away-1994-retro-jersey.jpg',
    blurb: 'A cult classic reborn. For every Germany fan in Malete.' },
  { slug: 'nigeria-kids-away-jersey-2023-24', name: 'Nigeria Kids Away Jersey 2023/24', teamName: 'Nigeria', season: '23/24', kitType: 'AWAY', league: 'Super Eagles', categoryType: 'NATIONAL', price: 17450, image: '/images/products/nigeria-home.webp',
    blurb: 'The Nigeria away shirt sized for the young ones — same colours, same badge, built for schoolyard matches. UP SUPER EAGLES! The most patriotic shirt in Malete.' },
  { slug: 'nigeria-1994-95-home-retro-jersey', name: 'Nigeria 1994/95 Home Retro Jersey', teamName: 'Nigeria', season: '94/95', kitType: 'HOME', league: 'Super Eagles', categoryType: 'NATIONAL', price: 48999, image: null,
    blurb: 'A cult classic reborn. UP SUPER EAGLES! The most patriotic shirt in Malete.' },
  { slug: 'nigeria-2022-away-white-jersey', teamName: 'Nigeria', season: '2022', kitType: 'AWAY', league: 'Super Eagles', categoryType: 'NATIONAL', price: 24999, image: '/images/products/nigeria-home.webp',
    blurb: 'UP SUPER EAGLES! The most patriotic shirt in Malete.' },
  { slug: 'nigeria-2024-stadium-away-authentic-jersey', name: 'Nigeria 2024 Stadium Away Authentic Jersey', teamName: 'Nigeria', season: '2024', kitType: 'AWAY', league: 'Super Eagles', categoryType: 'NATIONAL', price: 36499, image: '/images/products/nigeria-home.webp',
    desc: 'The AUTHENTIC (player-spec) Nigeria away shirt 2024 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'nigeria-2024-stadium-home-kids-jersey', name: 'Nigeria 2024 Stadium Home Kids Jersey', teamName: 'Nigeria', season: '2024', kitType: 'HOME', league: 'Super Eagles', categoryType: 'NATIONAL', price: 22999, image: '/images/products/nigeria-home.webp',
    blurb: 'The Nigeria home shirt sized for the young ones — same colours, same badge, built for schoolyard matches. UP SUPER EAGLES! The most patriotic shirt in Malete.' },
  { slug: 'nigeria-2025-stadium-away-jersey', name: 'Nigeria 2025 Stadium Away Jersey', teamName: 'Nigeria', season: '2025', kitType: 'AWAY', league: 'Super Eagles', categoryType: 'NATIONAL', price: 33499, image: '/images/products/nigeria-home.webp',
    blurb: 'The stadium-edition Nigeria away shirt — the one the crowd wears on matchday. UP SUPER EAGLES! The most patriotic shirt in Malete.' },
  { slug: 'nigeria-2025-stadium-home-jersey', name: 'Nigeria 2025 Stadium Home Jersey', teamName: 'Nigeria', season: '2025', kitType: 'HOME', league: 'Super Eagles', categoryType: 'NATIONAL', price: 24999, image: '/images/products/nigeria-home.webp',
    blurb: 'The stadium-edition Nigeria home shirt — the one the crowd wears on matchday. UP SUPER EAGLES! The most patriotic shirt in Malete.' },
  { slug: 'nigeria-2025-26-stadium-away-kids-jersey', name: 'Nigeria 2025/26 Stadium Away Kids Jersey', teamName: 'Nigeria', season: '25/26', kitType: 'AWAY', league: 'Super Eagles', categoryType: 'NATIONAL', price: 24999, image: '/images/products/nigeria-home.webp',
    blurb: 'The Nigeria away shirt sized for the young ones — same colours, same badge, built for schoolyard matches. UP SUPER EAGLES! The most patriotic shirt in Malete.' },
  { slug: 'nigeria-2026-stadium-away-authentic-jersey', name: 'Nigeria 2026 Stadium Away Authentic Jersey', teamName: 'Nigeria', season: '2026', kitType: 'AWAY', league: 'Super Eagles', categoryType: 'NATIONAL', price: 29999, image: '/images/products/nigeria-home.webp',
    desc: 'The AUTHENTIC (player-spec) Nigeria away shirt 2026 — the exact fit, fabric and heat-pressed details the players wear on the pitch, not the fan replica. Slim athletic fit; consider one size up.\n\nWant your name and favourite number printed in the official font? Add customisation at checkout.\n\nOrdering is simple: place your order, we confirm availability on WhatsApp, you pay by transfer or cash, then pick up in Malete or get it delivered to your hostel.' },
  { slug: 'nigeria-2026-stadium-home-jersey', name: 'Nigeria 2026 Stadium Home Jersey', teamName: 'Nigeria', season: '2026', kitType: 'HOME', league: 'Super Eagles', categoryType: 'NATIONAL', price: 24999, image: '/images/products/nigeria-home.webp',
    blurb: 'The stadium-edition Nigeria home shirt — the one the crowd wears on matchday. UP SUPER EAGLES! The most patriotic shirt in Malete.' },
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
