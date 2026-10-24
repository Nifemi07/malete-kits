'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCheck,
  Copy,
  CreditCard,
  Eye,
  Mail,
  MessageCircle,
  Package,
  Search,
  Truck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  api,
  displayPhone,
  formatNaira,
  JERSEY_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderView,
} from '@/lib/client-utils'

type AdminOrder = OrderView & {
  idempotencyKey?: string
  statusHistory?: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string | null; changedBy: string; createdAt: string }>
  paymentRecords?: Array<{ id: string; paymentStatus: string; previousStatus: string | null; method: string | null; amount: number | null; reference: string | null; note: string | null; recordedBy: string | null; createdAt: string }>
  notificationLogs?: Array<{ id: string; channel: string; recipient: string; status: string; attempts: number; error: string | null; createdAt: string }>
}

const STATUS_BADGE: Record<string, string> = {
  AWAITING_OWNER_CONFIRMATION: 'bg-amber-400/90 text-ink border-0',
  CONFIRMED: 'bg-pine-2 text-paper border-0',
  PROCESSING: 'bg-purple-500/80 text-white border-0',
  READY_FOR_PICKUP: 'bg-cyan-500/80 text-ink border-0',
  OUT_FOR_DELIVERY: 'bg-sky-500/80 text-ink border-0',
  COMPLETED: 'bg-lime text-ink border-0',
  CANCELLED: 'bg-destructive/80 text-white border-0',
}

const PAY_BADGE: Record<string, string> = {
  UNPAID: 'bg-destructive/15 text-red-300 border-destructive/40',
  PAYMENT_PENDING: 'bg-amber-400/15 text-amber-300 border-amber-400/40',
  PAID: 'bg-lime/15 text-lime border-lime/40',
  REFUNDED: 'bg-paper/10 text-paper border-paper/30',
}

export function OrdersTab({ onChanged }: { onChanged?: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [payment, setPayment] = useState('ALL')
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [waLinks, setWaLinks] = useState<{ ownerLink: string | null; customerLink: string } | null>(null)

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page), pageSize: '15' })
    if (q.trim()) sp.set('q', q.trim())
    if (status !== 'ALL') sp.set('status', status)
    if (payment !== 'ALL') sp.set('payment', payment)
    api<{ orders: AdminOrder[]; total: number; pages: number }>(`/api/admin/orders?${sp.toString()}`)
      .then((r) => {
        setOrders(r.orders)
        setTotal(r.total)
        setPages(r.pages)
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load orders')
        setOrders([])
      })
  }, [page, q, status, payment])

  useEffect(load, [load])

  const openDetail = (o: AdminOrder) => {
    setSelected(o)
    api<{ order: AdminOrder; whatsapp: { ownerLink: string | null; customerLink: string } }>(`/api/admin/orders/${o.id}`)
      .then((r) => {
        setSelected(r.order)
        setWaLinks(r.whatsapp)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load order'))
  }

  const refreshDetail = (updated: AdminOrder) => {
    // Re-fetch the full detail (audit trail, notification logs, history) so the
    // dialog reflects the change that was just made.
    api<{ order: AdminOrder; whatsapp: { ownerLink: string | null; customerLink: string } }>(`/api/admin/orders/${updated.id}`)
      .then((r) => {
        setSelected(r.order)
        setWaLinks(r.whatsapp)
      })
      .catch(() => setSelected(updated))
    load()
    onChanged?.()
  }

  return (
    <div>
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order no., customer, phone, email…"
            className="pl-9 bg-surface"
            aria-label="Search orders"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v) }}>
          <SelectTrigger className="w-full sm:w-52 bg-surface" aria-label="Filter by order status">
            <SelectValue placeholder="Order status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All order statuses</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payment} onValueChange={(v) => { setPage(1); setPayment(v) }}>
          <SelectTrigger className="w-full sm:w-48 bg-surface" aria-label="Filter by payment status">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All payments</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-paper/70">Order</TableHead>
              <TableHead className="text-paper/70">Customer</TableHead>
              <TableHead className="text-paper/70 hidden md:table-cell">Items</TableHead>
              <TableHead className="text-paper/70">Total</TableHead>
              <TableHead className="text-paper/70">Payment</TableHead>
              <TableHead className="text-paper/70">Status</TableHead>
              <TableHead className="text-right text-paper/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders === null ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading orders…</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No orders match these filters.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id} className="border-border hover:bg-white/[0.03]">
                  <TableCell>
                    <div className="font-mono font-bold text-lime">{o.orderNumber}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} ·{' '}
                      {o.fulfillmentMethod === 'PICKUP' ? 'Pickup' : o.deliveryZone === 'OTHER' ? 'Delivery (other)' : 'Delivery (Malete)'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-paper text-sm">{o.customerName}</div>
                    <div className="text-[11px] text-muted-foreground">{displayPhone(o.customerPhone)}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-xs text-paper/80">
                      {o.items.map((i) => `${i.size}×${i.quantity}`).join(', ')}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{o.items.length} line{o.items.length === 1 ? '' : 's'}</div>
                  </TableCell>
                  <TableCell className="font-bold text-paper whitespace-nowrap">{formatNaira(o.total)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${PAY_BADGE[o.paymentStatus]} font-bold text-[11px]`}>
                      {PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_BADGE[o.status]} font-bold text-[10px] whitespace-nowrap`}>
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="border-border text-paper hover:bg-white/5 h-9" onClick={() => openDetail(o)}>
                      <Eye className="h-4 w-4 mr-1" aria-hidden /> Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} order{total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-border text-paper disabled:opacity-30">
            Previous
          </Button>
          <span>Page {page} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="border-border text-paper disabled:opacity-30">
            Next
          </Button>
        </div>
      </div>

      {selected && (
        <OrderDetailDialog
          order={selected}
          waLinks={waLinks}
          onClose={() => setSelected(null)}
          onUpdated={refreshDetail}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function OrderDetailDialog({
  order,
  waLinks,
  onClose,
  onUpdated,
}: {
  order: AdminOrder
  waLinks: { ownerLink: string | null; customerLink: string } | null
  onClose: () => void
  onUpdated: (o: AdminOrder) => void
}) {
  const [busy, setBusy] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ method: 'BANK_TRANSFER', reference: '', note: '' })
  const [statusNote, setStatusNote] = useState('')
  const [notes, setNotes] = useState(order.internalNotes ?? '')

  const act = async (body: Record<string, unknown>, successMsg: string) => {
    setBusy(true)
    try {
      const r = await api<{ order: AdminOrder }>(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      toast.success(successMsg)
      onUpdated(r.order)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast(`${label} copied`))
  }

  const nextStatuses = (() => {
    switch (order.status) {
      case 'AWAITING_OWNER_CONFIRMATION':
        return ['CONFIRMED', 'CANCELLED']
      case 'CONFIRMED':
        return ['PROCESSING', 'CANCELLED']
      case 'PROCESSING':
        return order.fulfillmentMethod === 'PICKUP' ? ['READY_FOR_PICKUP', 'CANCELLED'] : ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED']
      case 'READY_FOR_PICKUP':
        return order.fulfillmentMethod === 'PICKUP' ? ['COMPLETED', 'CANCELLED'] : ['OUT_FOR_DELIVERY', 'CANCELLED']
      case 'OUT_FOR_DELIVERY':
        return ['COMPLETED', 'CANCELLED']
      default:
        return []
    }
  })()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3 text-paper">
            <span className="font-display text-2xl tracking-wider text-lime">{order.orderNumber}</span>
            <Badge className={`${STATUS_BADGE[order.status]} font-bold`}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            <Badge variant="outline" className={`${PAY_BADGE[order.paymentStatus]} font-bold`}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="bg-surface">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* ------------------------------ OVERVIEW ------------------------------ */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-surface p-4 text-sm space-y-1.5">
                <div className="font-bold text-paper mb-1">Customer</div>
                <div className="text-paper">{order.customerName}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {displayPhone(order.customerPhone)}
                  <button onClick={() => copy(order.customerPhone, 'Phone')} aria-label="Copy phone" className="text-muted-foreground hover:text-lime"><Copy className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground break-all">
                  {order.customerEmail}
                  <button onClick={() => copy(order.customerEmail, 'Email')} aria-label="Copy email" className="text-muted-foreground hover:text-lime"><Copy className="h-3.5 w-3.5" /></button>
                </div>
                <div className="pt-2">
                  {waLinks && (
                    <a href={waLinks.customerLink} target="_blank" rel="noreferrer">
                      <Button size="sm" className="bg-[#25D366] text-ink font-bold hover:bg-[#1FB857] h-8">
                        <MessageCircle className="h-3.5 w-3.5 mr-1" aria-hidden /> WhatsApp customer
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4 text-sm space-y-1.5">
                <div className="font-bold text-paper mb-1">
                  {order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}
                </div>
                {order.fulfillmentMethod === 'PICKUP' ? (
                  <div className="text-muted-foreground">Pickup in Malete — share location on confirmation.</div>
                ) : (
                  <>
                    <div className="text-paper">{order.address}</div>
                    {order.landmark && <div className="text-muted-foreground">Landmark: {order.landmark}</div>}
                    <div className="text-muted-foreground">
                      Zone: {order.deliveryZone === 'OTHER' ? 'Outside Malete' : 'Malete'}
                    </div>
                  </>
                )}
                {order.instructions && (
                  <div className="pt-1.5 text-muted-foreground border-t border-border/50">
                    <span className="font-semibold text-paper/70">Note:</span> {order.instructions}
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-paper/70">Item</TableHead>
                    <TableHead className="text-paper/70">Size</TableHead>
                    <TableHead className="text-paper/70">Qty</TableHead>
                    <TableHead className="text-paper/70">Customization</TableHead>
                    <TableHead className="text-right text-paper/70">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((i) => (
                    <TableRow key={i.id} className="border-border">
                      <TableCell>
                        <div className="font-semibold text-paper text-sm">{i.productName}</div>
                        <div className="text-[11px] text-muted-foreground">{JERSEY_TYPE_LABELS[i.jerseyType] ?? i.jerseyType} · {formatNaira(i.unitPrice)} each</div>
                      </TableCell>
                      <TableCell className="font-bold text-paper">{i.size}</TableCell>
                      <TableCell className="text-paper">{i.quantity}</TableCell>
                      <TableCell className="text-sm">
                        {i.custPlayerName || i.custPlayerNumber !== null ? (
                          <span className="text-lime font-semibold">“{i.custPlayerName ?? '—'}” #{i.custPlayerNumber ?? '—'}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-paper">{formatNaira(i.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-paper">{formatNaira(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Customization</span><span className="text-paper">{formatNaira(order.customizationFee)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}</span><span className="text-paper">{formatNaira(order.deliveryFee)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-lime"><span>Discount {order.promoCode ? `(${order.promoCode})` : ''}</span><span>−{formatNaira(order.discount)}</span></div>}
              <Separator className="bg-border" />
              <div className="flex justify-between text-base"><span className="font-bold text-paper">Total</span><span className="font-extrabold text-lime">{formatNaira(order.total)}</span></div>
            </div>

            {/* Status actions */}
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="font-bold text-paper text-sm mb-3">Update order status</div>
              {nextStatuses.length > 0 ? (
                <>
                  <Input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Optional note (e.g. 'Called customer — confirmed size L')" className="bg-ink border-border mb-3 text-sm" maxLength={300} />
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        disabled={busy}
                        variant={s === 'CANCELLED' ? 'destructive' : 'default'}
                        className={s === 'CANCELLED' ? '' : 'bg-pine-2 text-paper hover:bg-pine font-bold'}
                        onClick={() => act({ action: 'STATUS', status: s, note: statusNote || undefined }, `Status → ${ORDER_STATUS_LABELS[s]}`)}
                      >
                        {s === 'CONFIRMED' && <><CheckCheck className="h-4 w-4 mr-1.5" aria-hidden /> Confirm availability</>}
                        {s === 'PROCESSING' && <><Package className="h-4 w-4 mr-1.5" aria-hidden /> Move to processing</>}
                        {s === 'READY_FOR_PICKUP' && <><Package className="h-4 w-4 mr-1.5" aria-hidden /> Ready for pickup</>}
                        {s === 'OUT_FOR_DELIVERY' && <><Truck className="h-4 w-4 mr-1.5" aria-hidden /> Out for delivery</>}
                        {s === 'COMPLETED' && <><CheckCheck className="h-4 w-4 mr-1.5" aria-hidden /> Mark completed</>}
                        {s === 'CANCELLED' && <><XCircle className="h-4 w-4 mr-1.5" aria-hidden /> Cancel order</>}
                      </Button>
                    ))}
                  </div>
                  {nextStatuses.includes('CANCELLED') && (
                    <p className="mt-2 text-[11px] text-muted-foreground">Cancelling restores reserved stock automatically.</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No further status transitions ({ORDER_STATUS_LABELS[order.status]}).</p>
              )}
            </div>

            {/* Notifications + notes */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="font-bold text-paper text-sm mb-2">Notifications</div>
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  {(order.notificationLogs ?? []).length === 0 && <span>No notification attempts recorded.</span>}
                  {(order.notificationLogs ?? []).slice(0, 3).map((n) => (
                    <div key={n.id} className="flex items-center justify-between gap-2">
                      <span>{n.channel} → {n.recipient}</span>
                      <Badge variant="outline" className={`text-[10px] border-0 ${n.status === 'SENT' ? 'bg-lime/15 text-lime' : n.status === 'FAILED' ? 'bg-destructive/15 text-red-300' : 'bg-amber-400/15 text-amber-300'}`}>
                        {n.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  className="border-border text-paper hover:bg-white/5 w-full"
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await api(`/api/admin/orders/${order.id}/resend-email`, { method: 'POST' })
                      toast.success('Confirmation email re-sent')
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Resend failed')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  <Mail className="h-4 w-4 mr-1.5" aria-hidden /> Resend confirmation email
                </Button>
                {waLinks?.ownerLink && (
                  <a href={waLinks.ownerLink} target="_blank" rel="noreferrer" className="block mt-2">
                    <Button size="sm" variant="outline" className="border-border text-paper hover:bg-white/5 w-full">
                      <MessageCircle className="h-4 w-4 mr-1.5" aria-hidden /> WhatsApp order to store
                    </Button>
                  </a>
                )}
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="font-bold text-paper text-sm mb-2">Internal notes</div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private notes (never shown to customer)…"
                  className="min-h-20 bg-ink border-border text-sm"
                  maxLength={2000}
                />
                <Button
                  size="sm"
                  disabled={busy}
                  className="mt-2 bg-pine-2 text-paper hover:bg-pine font-bold w-full"
                  onClick={() => act({ action: 'NOTES', internalNotes: notes }, 'Notes saved')}
                >
                  Save notes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ------------------------------- PAYMENT ------------------------------ */}
          <TabsContent value="payment" className="space-y-5 mt-4">
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-paper/85 leading-relaxed">
              <strong className="text-amber-300">Verify before marking PAID.</strong> Check your bank app or mobile-money
              record yourself. A customer&apos;s screenshot or claim is <strong>not sufficient proof</strong> on its own.
              Every payment change is recorded with your account and a timestamp.
            </div>

            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Method verified</Label>
                  <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm((f) => ({ ...f, method: v }))}>
                    <SelectTrigger className="mt-1.5 bg-ink border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transfer reference (optional)</Label>
                  <Input value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. FT12345ABC" className="mt-1.5 bg-ink border-border" />
                </div>
              </div>
              <div>
                <Label>Verification note (required for PAID / REFUNDED)</Label>
                <Textarea
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. Checked GTBank app at 14:32 — credit alert of ₦18,500 received from 0803***"
                  className="mt-1.5 min-h-20 bg-ink border-border text-sm"
                  maxLength={300}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm" disabled={busy} className="bg-amber-400 text-ink font-bold hover:bg-amber-300"
                  onClick={() => act({ action: 'PAYMENT', paymentStatus: 'PAYMENT_PENDING', note: paymentForm.note || undefined }, 'Marked as payment pending')}
                >
                  <CreditCard className="h-4 w-4 mr-1.5" aria-hidden /> Mark PAYMENT PENDING
                </Button>
                <Button
                  size="sm" disabled={busy} className="bg-lime text-ink font-extrabold hover:bg-lime-deep"
                  onClick={() => act({ action: 'PAYMENT', paymentStatus: 'PAID', method: paymentForm.method, reference: paymentForm.reference || undefined, note: paymentForm.note }, 'Payment verified & marked PAID')}
                >
                  <CheckCheck className="h-4 w-4 mr-1.5" aria-hidden /> Mark PAID (verified)
                </Button>
                <Button
                  size="sm" disabled={busy} variant="outline" className="border-border text-paper hover:bg-white/5"
                  onClick={() => act({ action: 'PAYMENT', paymentStatus: 'UNPAID', note: paymentForm.note || undefined }, 'Reverted to UNPAID')}
                >
                  Set UNPAID
                </Button>
                {order.paymentStatus === 'PAID' && (
                  <Button
                    size="sm" disabled={busy} variant="destructive"
                    onClick={() => act({ action: 'PAYMENT', paymentStatus: 'REFUNDED', method: paymentForm.method, note: paymentForm.note }, 'Recorded refund')}
                  >
                    Record REFUND
                  </Button>
                )}
              </div>
            </div>

            {/* Payment records */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-surface font-bold text-paper text-sm">Payment audit trail</div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-paper/70">When</TableHead>
                    <TableHead className="text-paper/70">Change</TableHead>
                    <TableHead className="text-paper/70">By</TableHead>
                    <TableHead className="text-paper/70">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.paymentRecords ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-muted-foreground py-6 text-center">No payment records yet.</TableCell></TableRow>
                  ) : (
                    (order.paymentRecords ?? []).map((p) => (
                      <TableRow key={p.id} className="border-border">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                        </TableCell>
                        <TableCell className="text-sm text-paper">
                          {p.previousStatus ?? '—'} → <strong>{p.paymentStatus}</strong>
                          {p.method && <span className="text-muted-foreground"> · {p.method.replace('_', ' ').toLowerCase()}</span>}
                          {p.amount != null && <span className="text-lime"> · {formatNaira(p.amount)}</span>}
                        </TableCell>
                        <TableCell className="text-xs text-paper/80">{p.recordedBy ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-56 break-words">{p.note ?? p.reference ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ------------------------------- HISTORY ------------------------------ */}
          <TabsContent value="history" className="mt-4">
            <ol className="space-y-3">
              {(order.statusHistory ?? []).map((h) => (
                <li key={h.id} className="flex gap-3 items-start text-sm">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-lime shrink-0" aria-hidden />
                  <div>
                    <div className="text-paper">
                      {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus as keyof typeof ORDER_STATUS_LABELS] ?? h.fromStatus} → ` : ''}
                      <strong>{ORDER_STATUS_LABELS[h.toStatus as keyof typeof ORDER_STATUS_LABELS] ?? h.toStatus}</strong>
                    </div>
                    {h.note && <div className="text-muted-foreground text-xs mt-0.5">{h.note}</div>}
                    <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {new Date(h.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} · {h.changedBy}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
