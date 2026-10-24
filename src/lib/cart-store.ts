'use client'

// ---------------------------------------------------------------------------
// Cart store (zustand + localStorage persistence).
// Prices here are ESTIMATES for display; the server re-prices every order.
// ---------------------------------------------------------------------------
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartCustomization {
  playerName?: string
  playerNumber?: number
}

export interface CartLine {
  lineKey: string
  productId: string
  variantId: string
  slug: string
  name: string
  teamName: string
  season: string
  kitType: string
  imageUrl: string | null
  jerseyType: 'FAN' | 'PLAYER'
  size: string
  quantity: number
  estUnitPrice: number // estimate incl. jersey-type adjustment
  estCustomizationFee: number // per line (qty × fee)
  maxStock: number
  customization?: CartCustomization
}

export interface LastOrderInfo {
  id: string
  orderNumber: string
  trackingToken: string
  total: number
}

interface CartState {
  items: CartLine[]
  idempotencyKey: string
  lastOrder: LastOrderInfo | null
  addItem: (line: CartLine) => { merged: boolean }
  removeItem: (lineKey: string) => void
  updateQuantity: (lineKey: string, quantity: number) => void
  clear: () => void
  newIdempotencyKey: () => void
  setLastOrder: (o: LastOrderInfo) => void
}

function makeKey(variantId: string, jerseyType: string, c?: CartCustomization): string {
  return [variantId, jerseyType, c?.playerName?.trim().toUpperCase() ?? '', c?.playerNumber ?? ''].join(':')
}

function freshKey(): string {
  return crypto.randomUUID()
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      idempotencyKey: freshKey(),
      lastOrder: null,
      addItem: (line) => {
        const items = [...get().items]
        const idx = items.findIndex((i) => i.lineKey === line.lineKey)
        let merged = false
        if (idx >= 0) {
          const next = Math.min(items[idx].quantity + line.quantity, line.maxStock, 10)
          items[idx] = { ...items[idx], quantity: next }
          merged = true
        } else {
          items.push(line)
        }
        set({ items })
        return { merged }
      },
      removeItem: (lineKey) => set({ items: get().items.filter((i) => i.lineKey !== lineKey) }),
      updateQuantity: (lineKey, quantity) =>
        set({
          items: get().items.map((i) =>
            i.lineKey === lineKey ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock, 10)) } : i
          ),
        }),
      clear: () => set({ items: [], idempotencyKey: freshKey(), lastOrder: null }),
      newIdempotencyKey: () => set({ idempotencyKey: freshKey() }),
      setLastOrder: (o) => set({ lastOrder: o }),
    }),
    {
      name: 'malete-cart-v1',
      // keep idempotencyKey stable across reloads to prevent accidental double orders
      partialize: (s) => ({ items: s.items, idempotencyKey: s.idempotencyKey, lastOrder: s.lastOrder }),
    }
  )
)

export { makeKey as cartLineKey, freshKey as freshIdempotencyKey }
