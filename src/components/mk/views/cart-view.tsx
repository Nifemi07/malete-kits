'use client'

import Link from 'next/link'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { formatNaira } from '@/lib/client-utils'
import { useCart } from '@/lib/cart-store'
import { useMeta } from '../meta-context'

export function CartView({ onNavigate }: { onNavigate: (r: string) => void }) {
  const { items, removeItem, updateQuantity } = useCart()
  const { store } = useMeta()

  const subtotal = items.reduce((s, i) => s + i.estUnitPrice * i.quantity, 0)
  const customizationFee = items.reduce((s, i) => s + i.estCustomizationFee, 0)
  const total = subtotal + customizationFee // delivery added at checkout

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-surface border border-border mb-6">
          <ShoppingBag className="h-9 w-9 text-lime" aria-hidden />
        </div>
        <h1 className="font-display text-4xl font-bold uppercase text-paper">Your cart is empty</h1>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">
          Browse the racks and grab your team&apos;s kit — home, away, with your name on it if you like.
        </p>
        <Button size="lg" className="mt-7 h-13 bg-lime text-ink font-extrabold hover:bg-lime-deep px-8" onClick={() => onNavigate('#/shop')}>
          Start shopping <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase text-paper mb-8">
        Your Cart <span className="text-lime">({items.reduce((s, i) => s + i.quantity, 0)})</span>
      </h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Lines */}
        <ul className="space-y-4" aria-label="Cart items">
          {items.map((line) => (
            <li key={line.lineKey} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <Link
                href={`#/product/${line.slug}`}
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate(`#/product/${line.slug}`)
                }}
                className="shrink-0 overflow-hidden rounded-lg border border-border bg-surface h-24 w-20 sm:h-28 sm:w-24"
              >
                {line.imageUrl ? (
                   
                  <img src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold tracking-widest uppercase text-lime/90">{line.teamName}</div>
                    <div className="text-sm font-bold text-paper truncate">{line.name}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Size <span className="font-bold text-paper">{line.size}</span></span>
                      <span>{line.jerseyType === 'PLAYER' ? 'Player Version' : 'Fan Version'}</span>
                      {line.customization?.playerName && (
                        <span className="text-lime">“{line.customization.playerName}” #{line.customization.playerNumber ?? '—'}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => {
                      removeItem(line.lineKey)
                      toast('Removed from cart')
                    }}
                    aria-label={`Remove ${line.name} size ${line.size} from cart`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-stretch rounded-md border border-border bg-surface overflow-hidden h-9">
                    <button
                      type="button"
                      className="px-3 text-paper hover:bg-white/5 disabled:opacity-40"
                      onClick={() => updateQuantity(line.lineKey, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="grid place-items-center w-9 text-sm font-bold text-paper" aria-live="polite">{line.quantity}</span>
                    <button
                      type="button"
                      className="px-3 text-paper hover:bg-white/5 disabled:opacity-40"
                      onClick={() => updateQuantity(line.lineKey, line.quantity + 1)}
                      disabled={line.quantity >= Math.min(line.maxStock, 10)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-paper">{formatNaira(line.estUnitPrice * line.quantity + line.estCustomizationFee)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatNaira(line.estUnitPrice)} each{line.estCustomizationFee > 0 && ` + ${formatNaira(line.estCustomizationFee)} print`}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="font-display text-xl font-bold uppercase text-paper">Summary</h2>
          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jerseys subtotal</span>
              <span className="font-bold text-paper">{formatNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customization</span>
              <span className="font-bold text-paper">{customizationFee > 0 ? formatNaira(customizationFee) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery / pickup</span>
              <span className="text-muted-foreground text-xs italic">chosen at checkout</span>
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-paper">Estimated total</span>
              <span className="text-2xl font-extrabold text-lime">{formatNaira(total)}</span>
            </div>
          </div>
          {store.promoCode && store.promoPercent > 0 && (
            <p className="mt-3 rounded-md bg-pine/40 border border-pine-2/50 px-3 py-2 text-xs text-paper/80">
              Have code <span className="font-extrabold text-lime">{store.promoCode}</span>? Apply it at checkout for {store.promoPercent}% off jerseys.
            </p>
          )}
          <Button
            size="lg"
            className="mt-5 w-full h-13 bg-lime text-ink font-extrabold text-base hover:bg-lime-deep"
            onClick={() => onNavigate('#/checkout')}
          >
            Checkout <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
          </Button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
            No online payment. You&apos;ll pay by transfer or cash after the owner confirms availability.
          </p>
          <Button variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={() => onNavigate('#/shop')}>
            Continue shopping
          </Button>
        </aside>
      </div>
    </div>
  )
}
