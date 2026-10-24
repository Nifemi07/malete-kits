import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { stockUpdateSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/products/stock — bulk stock adjustments from the admin
 * inventory editor. Every change writes an InventoryLog entry (who/when/why).
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await req.json().catch(() => null)
    const { updates } = stockUpdateSchema.parse(body)

    await db.$transaction(async (tx) => {
      for (const u of updates) {
        const variant = await tx.productVariant.findUnique({ where: { id: u.variantId } })
        if (!variant) continue
        const delta = u.stock - variant.stock
        await tx.productVariant.update({ where: { id: u.variantId }, data: { stock: u.stock } })
        if (delta !== 0) {
          await tx.inventoryLog.create({
            data: {
              variantId: u.variantId,
              delta,
              reason: 'MANUAL_ADJUST',
              note: `Stock ${variant.stock} → ${u.stock}`,
              adminId: admin.sub,
            },
          })
        }
      }
    })

    return ok({ updated: updates.length })
  } catch (err) {
    return handleError(err)
  }
}
