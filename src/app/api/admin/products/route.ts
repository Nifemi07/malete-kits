import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/admin/products — full catalog with variants for the stock editor. */
export async function GET() {
  try {
    await requireAdmin()
    const products = await db.product.findMany({
      orderBy: [{ teamName: 'asc' }, { kitType: 'asc' }],
      include: {
        category: { select: { name: true, type: true } },
        variants: { orderBy: { size: 'asc' } },
      },
    })
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    products.forEach((p) => p.variants.sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)))
    return ok({ products })
  } catch (err) {
    return handleError(err)
  }
}
