'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, CircleDashed, Loader2, Lock, PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { api, formatNaira, ORDER_STATUS_LABELS, ORDER_STATUS_CUSTOMER_HINTS, PAYMENT_STATUS_LABELS, type OrderView } from '@/lib/client-utils'

export function TrackView({ initialToken, onNavigate }: { initialToken?: string; onNavigate: (r: string) => void }) {
  const [orderNumber, setOrderNumber] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [order, setOrder] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const show = useCallback((o: OrderView) => {
    setOrder(o)
    setError('')
  }, [])

  useEffect(() => {
    if (!initialToken) return
    api<{ order: OrderView }>(`/api/orders/track?token=${encodeURIComponent(initialToken)}`)
      .then((r) => show(r.order))
      .catch((e) => setError(e instanceof Error ? e.message : 'Invalid tracking link'))
      .finally(() => setLoading(false))
  }, [initialToken, show])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await api<{ order: OrderView }>('/api/orders/track', {
        method: 'POST',
        body: JSON.stringify({ orderNumber: orderNumber.trim(), identifier: identifier.trim() }),
      })
      show(r.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that order')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const payBadge = (ps: string) => {
    switch (ps) {
      case 'PAID':
        return 'bg-lime text-ink'
      case 'PAYMENT_PENDING':
        return 'bg-amber-400/90 text-ink'
      case 'REFUNDED':
        return 'bg-paper text-ink'
      default:
        // UNPAID is a normal state for a fresh order — amber, not red.
        return 'bg-amber-400/15 text-amber-200 border border-amber-400/40'
    }
  }

  // Order-status badge mirrors the admin semantic map: amber = waiting,
  // pine = confirmed/in progress, lime = completed, red = cancelled.
  const statusBadge = (s: string) => {
    switch (s) {
      case 'CANCELLED':
        return 'bg-destructive/80 text-white border-0'
      case 'COMPLETED':
        return 'bg-lime text-ink border-0'
      case 'CONFIRMED':
        return 'bg-pine-2 text-paper border-0'
      case 'PROCESSING':
        return 'bg-pine text-paper border-0'
      case 'AWAITING_OWNER_CONFIRMATION':
        return 'bg-amber-400/15 text-amber-200 border border-amber-400/40'
      default: // READY_FOR_PICKUP, OUT_FOR_DELIVERY
        return 'border-border text-paper'
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-pine border border-lime/40 mb-4">
          <PackageSearch className="h-8 w-8 text-lime" aria-hidden />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase text-paper">Track Your Order</h1>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
          Enter your order number plus the email or phone number you used at checkout — only you can see your order.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <Label htmlFor="track-num">Order number</Label>
          <Input id="track-num" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="MK-1024" className="mt-1.5 bg-surface font-mono tracking-wider" required />
        </div>
        <div>
          <Label htmlFor="track-id">Email or phone used</Label>
          <Input id="track-id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com / 08012345678" className="mt-1.5 bg-surface" required />
        </div>
        <Button type="submit" size="lg" disabled={loading} className="h-11 bg-lime text-ink font-extrabold hover:bg-lime-deep">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'Track'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-paper">
          {error}
        </p>
      )}

      {order && (
        <article className="mt-8 rounded-xl border border-border bg-card overflow-hidden" aria-label={`Order ${order.orderNumber}`}>
          {/* header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Order</div>
              <div className="font-display text-3xl font-bold tracking-wider text-lime">{order.orderNumber}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Placed {new Date(order.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={`${payBadge(order.paymentStatus)} border-0 font-extrabold`}>
                Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
              </Badge>
              <Badge variant="outline" className={`${statusBadge(order.status)} font-extrabold`}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
          </div>

          {/* status hint */}
          <div className="px-6 py-4 bg-pine/25 border-b border-border text-sm text-paper/85">
            {ORDER_STATUS_CUSTOMER_HINTS[order.status as keyof typeof ORDER_STATUS_CUSTOMER_HINTS] ?? ''}
          </div>

          {/* timeline */}
          <div className="px-6 py-6">
            <StatusTimeline status={order.status} history={order.statusHistory ?? []} />
          </div>

          <Separator className="bg-border" />

          {/* items */}
          <ul className="px-6 py-5 space-y-3" aria-label="Items">
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

          <div className="px-6 py-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-paper">{formatNaira(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customization</span><span className="text-paper">{formatNaira(order.customizationFee)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}</span><span className="text-paper">{formatNaira(order.deliveryFee)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-lime"><span>Discount</span><span>−{formatNaira(order.discount)}</span></div>}
            <Separator className="bg-border" />
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-paper">Total</span>
              <span className="text-2xl font-extrabold text-lime">{formatNaira(order.total)}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-1">
              {order.fulfillmentMethod === 'PICKUP'
                ? 'Pickup in Malete'
                : `Delivery: ${order.address}${order.deliveryZone === 'OTHER' ? ' (outside Malete)' : ''}`}
            </div>
          </div>

          {order.status === 'AWAITING_OWNER_CONFIRMATION' && order.paymentStatus === 'UNPAID' && (
            <div className="px-6 py-4 border-t border-border bg-surface text-xs text-muted-foreground">
              Payment instructions will be shared by the owner after availability is confirmed. Do not pay before that.
            </div>
          )}
        </article>
      )}

      <Accordion type="single" collapsible className="mt-10">
        <AccordionItem value="privacy">
          <AccordionTrigger className="text-sm font-bold text-paper">How is my order protected?</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-lime" aria-hidden /> Tracking requires BOTH your order number and a matching email/phone.</span>{' '}
            Nobody can view your order with just the order number. The store team can only access orders through the secure admin dashboard.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

// ---------------------------------------------------------------------------
function StatusTimeline({ status, history }: { status: string; history: OrderView['statusHistory'] }) {
  const cancelled = status === 'CANCELLED'
  const steps: Array<{ key: string; label: string; done: boolean }> = cancelled
    ? [{ key: 'CANCELLED', label: 'Cancelled', done: true }]
    : [
        { key: 'AWAITING_OWNER_CONFIRMATION', label: 'Order received', done: true },
        { key: 'CONFIRMED', label: 'Availability confirmed', done: ['CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(status) },
        { key: 'PROCESSING', label: 'Preparing / printing', done: ['PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(status) },
        {
          key: 'READY',
          label: 'Ready for pickup / out for delivery',
          done: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(status),
        },
        { key: 'COMPLETED', label: 'Completed', done: status === 'COMPLETED' },
      ]

  return (
    <div>
      <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-4">Progress</div>
      <ol className="space-y-0" aria-label="Order progress">
        {steps.map((s, idx) => (
          <li key={s.key} className="relative flex gap-3 pb-6 last:pb-0">
            {idx < steps.length - 1 && <span className={`absolute left-[11px] top-6 bottom-0 w-px ${s.done ? 'bg-lime/60' : 'bg-border'}`} aria-hidden />}
            {s.done ? (
              <CircleCheck className={`h-6 w-6 shrink-0 ${cancelled ? 'text-destructive' : 'text-lime'}`} aria-hidden />
            ) : (
              <CircleDashed className="h-6 w-6 shrink-0 text-muted-foreground/50" aria-hidden />
            )}
            <div className="pt-0.5">
              <div className={`text-sm font-bold ${s.done ? (cancelled ? 'text-destructive' : 'text-paper') : 'text-muted-foreground/60'}`}>{s.label}</div>
              {history
                .filter((h) => h.toStatus === s.key || (s.key === 'READY' && (h.toStatus === 'READY_FOR_PICKUP' || h.toStatus === 'OUT_FOR_DELIVERY')))
                .map((h) => (
                  <div key={h.id} className="text-xs text-muted-foreground mt-0.5">
                    {new Date(h.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                    {h.note ? ` — ${h.note}` : ''}
                  </div>
                ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
