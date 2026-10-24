import { ORDER_NUMBER_PREFIX, ORDER_NUMBER_START } from './constants'

/**
 * Generates the next sequential order number (e.g. MK-1024) atomically.
 * Uses a Counter row incremented inside the caller's transaction.
 * Pass a Prisma transaction client as `tx`.
 */
export async function nextOrderNumber(
  tx: { counter: { upsert: (args: Record<string, unknown>) => Promise<{ value: number }> } }
): Promise<string> {
  const counter = await tx.counter.upsert({
    where: { id: 'ORDER' },
    create: { id: 'ORDER', value: ORDER_NUMBER_START + 1 },
    update: { value: { increment: 1 } },
  })
  return `${ORDER_NUMBER_PREFIX}-${counter.value}`
}

/** Secure, unpredictable token for direct order-tracking links. */
export function generateTrackingToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
