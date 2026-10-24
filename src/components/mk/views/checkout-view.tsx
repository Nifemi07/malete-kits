'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ClipboardCheck, Lock, ShoppingBag, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { api, formatNaira, type OrderView } from '@/lib/client-utils'
import { useCart, freshIdempotencyKey } from '@/lib/cart-store'
import { useMeta } from '../meta-context'

export function CheckoutView({ onNavigate, onOrderPlaced }: { onNavigate: (r: string) => void; onOrderPlaced: () => void }) {
  const { items, idempotencyKey, clear, setLastOrder } = useCart()
  const { store } = useMeta()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [fulfillment, setFulfillment] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [deliveryZone, setDeliveryZone] = useState<'MALETE' | 'OTHER'>('MALETE')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [instructions, setInstructions] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const placedRef = useRef(false)

  useEffect(() => {
    if (items.length === 0 && !submitting && !placedRef.current) onNavigate('#/cart')
  }, [items.length, submitting])

  const subtotal = items.reduce((s, i) => s + i.estUnitPrice * i.quantity, 0)
  const customizationFee = items.reduce((s, i) => s + i.estCustomizationFee, 0)
  const deliveryFee = fulfillment === 'PICKUP' ? store.pickupFee : deliveryZone === 'OTHER' ? store.deliveryFeeOther : store.deliveryFeeMalete

  const discount = useMemo(() => {
    if (!promoInput.trim() || !store.promoCode || promoInput.trim().toUpperCase() !== store.promoCode.toUpperCase()) return 0
    return Math.min(Math.floor((subtotal * store.promoPercent) / 100), 2000)
  }, [promoInput, subtotal, store])

  const total = subtotal + customizationFee + deliveryFee - discount

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (fullName.trim().length < 2) e.fullName = 'Enter your full name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email — your confirmation goes here'
    const digits = phone.replace(/[\s()-]/g, '')
    if (!/^(\+?234|0)[789][01]\d{8}$/.test(digits)) e.phone = 'Enter a valid Nigerian phone (e.g. 08012345678)'
    if (fulfillment === 'DELIVERY' && address.trim().length < 6) e.address = 'Enter your hostel, lodge or address in Malete'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) {
      toast.error('Fix the highlighted fields first')
      return
    }
    setSubmitting(true)
    try {
      const res = await api<{ duplicate: boolean; order: OrderView }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            jerseyType: i.jerseyType,
            size: i.size,
            quantity: i.quantity,
            customization: i.customization
              ? { playerName: i.customization.playerName || undefined, playerNumber: i.customization.playerNumber }
              : undefined,
          })),
          fulfillmentMethod: fulfillment,
          deliveryZone: fulfillment === 'DELIVERY' ? deliveryZone : null,
          address: fulfillment === 'DELIVERY' ? address.trim() : null,
          landmark: landmark.trim() || null,
          instructions: instructions.trim() || null,
          promoCode: promoInput.trim() || null,
        }),
      })

      placedRef.current = true // suppress the empty-cart redirect effect
      clear() // resets cart + regenerates idempotency key (also nulls lastOrder)
      setLastOrder({
        id: res.order.id,
        orderNumber: res.order.orderNumber,
        trackingToken: (res.order as unknown as { trackingToken?: string }).trackingToken ?? '',
        total: res.order.total,
      })
      if (res.duplicate) toast.info('This order was already submitted — showing your original order.')
      else toast.success('Order placed successfully!')
      onOrderPlaced()
      onNavigate('#/order-confirmation')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not place order'
      toast.error(message, { duration: 8000 })
      // Stock may have changed — refresh estimates on the cart
      if (message.toLowerCase().includes('stock') || message.toLowerCase().includes('sold out')) {
        onNavigate('#/cart')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <button
        onClick={() => onNavigate('#/cart')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-lime transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back to cart
      </button>
      <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase text-paper mb-2">Checkout</h1>
      <p className="text-muted-foreground text-sm mb-8 flex items-center gap-2">
        <Lock className="h-4 w-4 text-lime" aria-hidden /> No account needed · No online payment · We confirm availability first
      </p>

      <form
        className="grid lg:grid-cols-[1fr_400px] gap-8 items-start"
        onSubmit={(e) => {
          e.preventDefault()
          if (!submitting) submit()
        }}
      >
        {/* ------------------------------ Form ------------------------------ */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="font-display text-xl font-bold uppercase text-paper mb-4">Your details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="fullName">Full name *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Chinedu Okafor" className="mt-1.5 bg-surface" autoComplete="name" required />
                {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email address *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 bg-surface" autoComplete="email" required />
                <p className="mt-1 text-[11px] text-muted-foreground">Your order confirmation will be sent here.</p>
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone (WhatsApp) *</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className="mt-1.5 bg-surface" autoComplete="tel" required />
                <p className="mt-1 text-[11px] text-muted-foreground">The owner contacts you here to confirm.</p>
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="fulfillment-heading">
            <h2 id="fulfillment-heading" className="font-display text-xl font-bold uppercase text-paper mb-4">Pickup or delivery</h2>
            <RadioGroup value={fulfillment} onValueChange={(v) => setFulfillment(v as 'PICKUP' | 'DELIVERY')} className="grid sm:grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${fulfillment === 'PICKUP' ? 'border-lime bg-lime/5' : 'border-border bg-surface'}`}
              >
                <RadioGroupItem value="PICKUP" id="fulfillment-pickup" className="mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-paper">Pickup in Malete</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {store.pickupFee === 0 ? 'Free — meet around KWASU campus' : `Fee: ${formatNaira(store.pickupFee)}`}
                  </div>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${fulfillment === 'DELIVERY' ? 'border-lime bg-lime/5' : 'border-border bg-surface'}`}
              >
                <RadioGroupItem value="DELIVERY" id="fulfillment-delivery" className="mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-paper">Deliver to me</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Malete: {formatNaira(store.deliveryFeeMalete)} · Outside: {formatNaira(store.deliveryFeeOther)}
                  </div>
                </div>
              </label>
            </RadioGroup>

            {fulfillment === 'DELIVERY' && (
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deliveryZone">Delivery zone *</Label>
                  <select
                    id="deliveryZone"
                    value={deliveryZone}
                    onChange={(e) => setDeliveryZone(e.target.value as 'MALETE' | 'OTHER')}
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-paper"
                  >
                    <option value="MALETE">Malete / KWASU area — {formatNaira(store.deliveryFeeMalete)}</option>
                    <option value="OTHER">Outside Malete — {formatNaira(store.deliveryFeeOther)}</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="landmark">Nearest landmark (optional)</Label>
                  <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Opposite KT Gate" className="mt-1.5 bg-surface" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Hostel / lodge / delivery address *</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Peace Lodge, Room 4, Off Campus Road" className="mt-1.5 bg-surface" />
                  {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address}</p>}
                </div>
              </div>
            )}
            {fulfillment === 'PICKUP' && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-pine/30 border border-pine-2/40 px-3.5 py-2.5 text-xs text-paper/80">
                <Truck className="h-4 w-4 mt-0.5 shrink-0 text-lime" aria-hidden />
                We&apos;ll share the exact pickup point in Malete when the owner confirms your order on WhatsApp.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="font-display text-xl font-bold uppercase text-paper mb-4">Anything else? <span className="text-muted-foreground text-sm normal-case font-sans">(optional)</span></h2>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Please print 'VELOZ' with number 7. I'm usually free after 4pm."
              className="min-h-24 bg-surface"
              maxLength={500}
            />
          </section>
        </div>

        {/* ----------------------------- Summary ----------------------------- */}
        <aside className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="font-display text-xl font-bold uppercase text-paper">Order summary</h2>

          <ul className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1" aria-label="Items">
            {items.map((i) => (
              <li key={i.lineKey} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold text-paper truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Size {i.size} · {i.jerseyType === 'PLAYER' ? 'Player' : 'Fan'} · ×{i.quantity}
                    {i.customization?.playerName ? ` · “${i.customization.playerName}” #${i.customization.playerNumber ?? '—'}` : ''}
                  </div>
                </div>
                <div className="font-bold text-paper shrink-0">{formatNaira(i.estUnitPrice * i.quantity + i.estCustomizationFee)}</div>
              </li>
            ))}
          </ul>

          <Separator className="my-4 bg-border" />

          {/* Promo */}
          <div className="flex gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder={store.promoCode ? `Promo code (e.g. ${store.promoCode})` : 'Promo code'}
              className="bg-surface text-sm"
              aria-label="Promo code"
            />
          </div>
          {promoInput && (
            <p className={`mt-1.5 text-xs ${discount > 0 ? 'text-lime font-semibold' : 'text-muted-foreground'}`}>
              {discount > 0 ? `Code applied — ${store.promoPercent}% off jerseys` : 'Code not recognised — total stays standard'}
            </p>
          )}

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Jerseys subtotal</span><span className="font-bold text-paper">{formatNaira(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customization</span><span className="font-bold text-paper">{formatNaira(customizationFee)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{fulfillment === 'PICKUP' ? 'Pickup' : 'Delivery'}</span><span className="font-bold text-paper">{formatNaira(deliveryFee)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-lime"><span>Discount</span><span className="font-bold">−{formatNaira(discount)}</span></div>
            )}
            <Separator className="bg-border" />
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-paper">Total payable</span>
              <span className="text-2xl font-extrabold text-lime">{formatNaira(total)}</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="mt-5 w-full h-13 bg-lime text-ink font-extrabold text-base hover:bg-lime-deep disabled:opacity-60"
          >
            {submitting ? (
              <>
                <ClipboardCheck className="mr-2 h-5 w-5 animate-pulse" aria-hidden /> Placing order…
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-5 w-5" aria-hidden /> Place order — {formatNaira(total)}
              </>
            )}
          </Button>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            By placing this order you agree to pay {formatNaira(total)} by bank transfer or cash <strong className="text-paper/70">after</strong> the
            store confirms availability. Nothing is charged online. Final totals are re-verified server-side.
          </p>
        </aside>
      </form>
    </div>
  )
}
