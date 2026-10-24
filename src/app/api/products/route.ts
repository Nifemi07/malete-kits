import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products — catalog listing with filters + search.
 * Query params: category (slug), type (CLUB|NATIONAL), team, season, kit, league,
 *               q (text search), sort (featured|price_asc|price_desc|newest), featured=1
 * Stock info is aggregated per product so cards can show "Sold out" badges.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const where: Record<string, unknown> = { active: true }

  const categorySlug = sp.get('category')
  if (categorySlug) where.category = { slug: categorySlug }
  const type = sp.get('type')
  if (type === 'CLUB' || type === 'NATIONAL') where.category = { type }
  const team = sp.get('team')
  if (team) where.teamName = team
  const season = sp.get('season')
  if (season) where.season = season
  const kit = sp.get('kit')
  if (kit && ['HOME', 'AWAY', 'THIRD'].includes(kit)) where.kitType = kit
  const league = sp.get('league')
  if (league) where.league = league
  if (sp.get('featured') === '1') where.featured = true
  const q = sp.get('q')?.trim()
  if (q) {
    where.OR = [
      { teamName: { contains: q } },
      { name: { contains: q } },
      { league: { contains: q } },
      { season: { contains: q } },
    ]
  }

  const orderBy = (() => {
    switch (sp.get('sort')) {
      case 'price_asc':
        return { basePrice: 'asc' as const }
      case 'price_desc':
        return { basePrice: 'desc' as const }
      case 'newest':
        return { createdAt: 'desc' as const }
      default:
        return [{ featured: 'desc' as const }, { createdAt: 'desc' as const }]
    }
  })()

  const products = await db.product.findMany({
    where,
    orderBy,
    include: {
      category: { select: { slug: true, name: true, type: true } },
      variants: { where: { active: true }, select: { size: true, stock: true, price: true } },
    },
  })

  const mapped = products.map((p) => {
    const totalStock = p.variants.reduce((s, v) => s + v.stock, 0)
    const minVariantPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price ?? p.basePrice)) : p.basePrice
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      teamName: p.teamName,
      season: p.season,
      kitType: p.kitType,
      league: p.league,
      category: p.category,
      basePrice: p.basePrice,
      displayPrice: minVariantPrice,
      playerVersionAdj: p.playerVersionAdj,
      customizationAvailable: p.customizationAvailable,
      badge: p.badge,
      featured: p.featured,
      imageUrl: p.imageUrl,
      totalStock,
      inStock: totalStock > 0,
    }
  })

  return NextResponse.json({ products: mapped, count: mapped.length })
}
