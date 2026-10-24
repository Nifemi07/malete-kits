import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/products/[slug] — full product detail incl. per-size stock. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { slug: true, name: true, type: true } },
      variants: { where: { active: true }, select: { id: true, size: true, stock: true, price: true, sku: true } },
    },
  })

  if (!product || !product.active) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Order sizes logically
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const variants = [...product.variants].sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size))

  return NextResponse.json({
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      teamName: product.teamName,
      season: product.season,
      kitType: product.kitType,
      league: product.league,
      category: product.category,
      description: product.description,
      basePrice: product.basePrice,
      playerVersionAdj: product.playerVersionAdj,
      customizationAvailable: product.customizationAvailable,
      badge: product.badge,
      imageUrl: product.imageUrl,
      variants,
    },
  })
}
