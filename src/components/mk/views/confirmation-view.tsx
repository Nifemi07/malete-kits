'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Copy, MessageCircle, Package, ReceiptText, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { api, formatNaira, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderView } from '@/lib/client-utils'
import { useCart } from '@/lib/cart-store'

export function ConfirmationView({ onNavigate }: { onNavigate: (r: string) => void }) {
  const lastOrder = useCart((s) => s.lastOrder)
  const [order, setOrder] = useState<(OrderView & { trackingToken?: string }) | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let cancelled = false
    if (lastOrder) {
      // Refetch authoritative data via the secure tracking token
      api<{ order: OrderView & { trackingToken?: string } }>(`/api/orders/track?token=${encodeURIComponent(lastOrder.trackingToken)}`)
        .then((r) => {
          if (cancelled) return
          setOrder(r.order)
          setStatus('ready')
        })
        .catch(() => {
          if (!cancelled) setStatus('missing')
        })
      return () => {
        cancelled = true
      }
    }
    // No order in local storage — wait briefly for zustand hydration, then show fallback
    const t = setTimeout(() => {
      if (!cancelled && !useCart.getState().lastOrder) setStatus('missing')
    }, 1500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [lastOrder])

  const waLink = useMemo(() => order?.whatsappShareLink ?? null, [order])

  if (status === 'missing') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-paper">Order confirmation unavailable</h1>
        <p className="mt-3 text-muted-foreground">
          Your order was likely placed earlier — track it with your order number, or contact us on WhatsApp.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button className="bg-lime text-ink font-bold hover:bg-lime-deep" onClick={() => onNavigate('#/track')}>Track an order</Button>
          <Button variant="outline" className="border-border text-paper" onClick={() => onNavigate('#/shop')}>Keep shopping</Button>
        </div>
      </div>
    )
  }

  if (status !== 'ready' || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
        <Skeleton className="h-16 w-2/3 bg-surface" />
        <Skeleton className="h-40 bg-surface" />
        <Skeleton className="h-64 bg-surface" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      {/* Success header */}
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-pine border-2 border-lime mb-5 lime-glow">
          <CheckCircle2 className="h-10 w-10 text-lime" aria-hidden />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase text-paper">Order Received!</h1>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">
          Thanks {order.customerName.split(' ')[0]} — we&apos;ve got your order and a confirmation email is on its way to{' '}
          <span className="text-paper font-semibold">{order.customerEmail}</span>.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-lime/40 bg-pine/30 px-6 py-4">
          <span className="text-xs font-bold tracking-widest uppercase text-paper/70">Order number</span>
          <span className="font-display text-3xl font-bold tracking-wider text-lime">{order.orderNumber}</span>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10 text-paper/80 hover:text-lime transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(order.orderNumber).then(() => toast('Order number copied'))
            }}
            aria-label="Copy order number"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* IMPORTANT notice */}
      <div className="mt-8 rounded-xl border border-lime/30 bg-surface p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-lime shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm leading-relaxed text-paper/85">
            <strong className="text-lime">What happens now:</strong> the store owner will confirm availability and contact you on
            <strong> {order.customerPhone.replace(/^234/, '0')}</strong> / WhatsApp with payment instructions. Payment status right now:{' '}
            <strong className="uppercase">{PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}</strong>. Please don&apos;t send money until the owner
            confirms your jerseys and shares payment details. <strong>Never pay into a personal account you weren&apos;t given by us.</strong>
          </div>
        </div>
      </div>

      {/* MODE A — WhatsApp click-to-chat */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 font-bold text-paper">
              <MessageCircle className="h-5 w-5 text-lime" aria-hidden /> Speed things up on WhatsApp
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-md">
              Tap below to open WhatsApp with your full order details pre-filled — send it to the store so the owner can
              confirm availability faster. (You press send yourself; nothing is sent automatically.)
            </p>
          </div>
          {waLink ? (
            <a href={waLink} target="_blank" rel="noreferrer" className="shrink-0">
              <Button size="lg" className="h-12 bg-[#25D366] text-ink font-extrabold hover:bg-[#1FB857]">
                <MessageCircle className="mr-2 h-5 w-5" aria-hidden /> Send order on WhatsApp
              </Button>
            </a>
          ) : (
            <p className="text-xs text-muted-foreground max-w-xs">
              WhatsApp number isn&apos;t configured yet — the owner will reach out to you directly.
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 font-display font-bold uppercase text-paper">
            <ReceiptText className="h-5 w-5 text-lime" aria-hidden /> Order summary
          </div>
          <span className="text-xs rounded-md bg-ink px-2.5 py-1 border border-border text-paper/80">
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <ul className="px-5 py-4 space-y-3" aria-label="Order items">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 text-sm">
              <div>
                <div className="font-semibold text-paper">{i.productName}</div>
                <div className="text-xs text-muted-foreground">
                  Size {i.size} · {i.jerseyType === 'PLAYER' ? 'Player Version' : 'Fan Version'} · ×{i.quantity}
                  {i.custPlayerName ? ` · “${i.custPlayerName}” #${i.custPlayerNumber ?? '—'}` : ''}
                </div>
              </div>
              <div className="font-bold text-paper">{formatNaira(i.lineTotal)}</div>
            </li>
          ))}
        </ul>
        <Separator className="bg-border" />
        <div className="px-5 py-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-paper">{formatNaira(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Customization</span><span className="text-paper">{formatNaira(order.customizationFee)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}</span><span className="text-paper">{formatNaira(order.deliveryFee)}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-lime"><span>Discount {order.promoCode ? `(${order.promoCode})` : ''}</span><span>−{formatNaira(order.discount)}</span></div>
          )}
          <Separator className="bg-border" />
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-paper">Total payable</span>
            <span className="text-2xl font-extrabold text-lime">{formatNaira(order.total)}</span>
          </div>
          <div className="pt-1 text-xs text-muted-foreground">
            {order.fulfillmentMethod === 'PICKUP'
              ? 'Pickup in Malete — exact point shared on confirmation.'
              : `Delivery to: ${order.address}${order.deliveryZone === 'OTHER' ? ' (outside Malete)' : ' (Malete)'}`}
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" variant="outline" className="border-border text-paper hover:bg-white/5" onClick={() => onNavigate(`#/track?token=${lastOrder?.trackingToken ?? ''}`)}>
          <Package className="mr-2 h-5 w-5" aria-hidden /> Track this order
        </Button>
        <Button size="lg" variant="outline" className="border-border text-paper hover:bg-white/5 font-bold" onClick={() => onNavigate('#/shop')}>
          Continue shopping
        </Button>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Save your order number <span className="font-bold text-paper">{order.orderNumber}</span> — you&apos;ll need it (plus your email
        or phone) to track the order. <Link href="#/track" onClick={(e) => { e.preventDefault(); onNavigate('#/track') }} className="text-lime hover:underline">Order tracking →</Link>
      </p>
    </div>
  )
}
