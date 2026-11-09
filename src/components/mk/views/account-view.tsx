'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Loader2,
  LogOut,
  MailCheck,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import {
  api,
  formatNaira,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CUSTOMER_HINTS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/client-utils'

interface CustomerInfo {
  email: string
  name: string | null
  emailVerified: boolean
  memberSince: string
}

interface AccountOrder {
  id: string
  orderNumber: string
  trackingToken: string
  customerName: string
  fulfillmentMethod: string
  deliveryZone: string | null
  address: string | null
  subtotal: number
  customizationFee: number
  deliveryFee: number
  discount: number
  total: number
  paymentStatus: string
  status: string
  createdAt: string
  items: Array<{
    id: string
    productName: string
    jerseyType: string
    size: string
    quantity: number
    custPlayerName: string | null
    custPlayerNumber: number | null
    lineTotal: number
  }>
}

const RESEND_COOLDOWN_SECONDS = 30

export function AccountView({ onNavigate }: { onNavigate: (route: string) => void }) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [booting, setBooting] = useState(true)

  // Sign-in flow
  const [phase, setPhase] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'sending' | 'verifying' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resendIn, setResendIn] = useState(0)

  // Orders
  const [orders, setOrders] = useState<AccountOrder[] | null>(null)

  const loadOrders = useCallback(() => {
    api<{ orders: AccountOrder[] }>('/api/customer/orders')
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]))
  }, [])

  useEffect(() => {
    api<{ customer: CustomerInfo | null }>('/api/customer/auth/me')
      .then((r) => {
        setCustomer(r.customer)
        if (r.customer) loadOrders()
      })
      .catch(() => setCustomer(null))
      .finally(() => setBooting(false))
  }, [loadOrders])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy('sending')
    setError('')
    setNotice('')
    try {
      const r = await api<{ emailDelivered: boolean; message: string }>('/api/customer/auth/request-code', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      setPhase('code')
      setCode('')
      setResendIn(RESEND_COOLDOWN_SECONDS)
      setNotice(
        r.emailDelivered
          ? r.message
          : 'We could not send the email just now (email delivery is not configured). Please try again shortly or contact the store.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code')
    } finally {
      setBusy(null)
    }
  }

  const verify = async (value?: string) => {
    const otp = (value ?? code).replace(/\D/g, '')
    if (otp.length !== 6) return
    setBusy('verifying')
    setError('')
    try {
      const r = await api<{ customer: { email: string; name: string | null } }>('/api/customer/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), code: otp }),
      })
      setCustomer({ email: r.customer.email, name: r.customer.name, emailVerified: true, memberSince: new Date().toISOString() })
      setPhase('email')
      setCode('')
      setNotice('')
      loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code')
      setCode('')
    } finally {
      setBusy(null)
    }
  }

  const logout = async () => {
    await api('/api/customer/auth/logout', { method: 'POST' }).catch(() => {})
    setCustomer(null)
    setOrders(null)
    setPhase('email')
    setEmail('')
    setError('')
    setNotice('')
  }

  // ------------------------------- BOOT --------------------------------------
  if (booting) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-24 grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime" aria-hidden />
      </div>
    )
  }

  // ---------------------------- SIGNED IN ------------------------------------
  if (customer) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-pine border border-lime/40">
              <UserRound className="h-7 w-7 text-lime" aria-hidden />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold uppercase text-paper">
                {customer.name ? customer.name.split(' ')[0] : 'My Account'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                {customer.email}
                {customer.emailVerified && (
                  <Badge className="bg-lime/15 text-lime border border-lime/40 font-bold text-[10px] gap-1">
                    <MailCheck className="h-3 w-3" aria-hidden /> Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={logout}
            className="border-border text-paper hover:bg-white/5 gap-2"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </Button>
        </div>

        <h2 className="font-display text-lg font-bold tracking-widest uppercase text-paper/80 mb-4">My Orders</h2>
        {orders === null && (
          <div className="py-12 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-lime" aria-hidden />
          </div>
        )}
        {orders !== null && orders.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <PackageSearch className="h-10 w-10 text-muted-foreground mx-auto" aria-hidden />
            <p className="mt-4 font-bold text-paper">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Orders you place with <span className="text-paper">{customer.email}</span> will appear here automatically.
            </p>
            <Button onClick={() => onNavigate('#/shop')} className="mt-5 h-11 bg-lime text-ink font-extrabold hover:bg-lime-deep">
              <ShoppingBag className="mr-2 h-4 w-4" aria-hidden /> Shop jerseys
            </Button>
          </div>
        )}
        {orders !== null && orders.length > 0 && (
          <ul className="space-y-4" aria-label="My orders">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border bg-pine/20">
                  <div>
                    <div className="font-display text-xl font-bold tracking-wider text-lime">{o.orderNumber}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(o.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                      {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
                      {o.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderBadge value={o.paymentStatus} map={PAYMENT_STATUS_LABELS} kind="payment" />
                    <OrderBadge value={o.status} map={ORDER_STATUS_LABELS} kind="status" />
                  </div>
                </div>
                <ul className="px-5 py-4 space-y-2 text-sm" aria-label={`${o.orderNumber} items`}>
                  {o.items.slice(0, 3).map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="text-paper/90">
                        {i.productName} · {i.jerseyType === 'PLAYER' ? 'Player' : 'Fan'} · {i.size} ×{i.quantity}
                        {i.custPlayerName ? ` · “${i.custPlayerName}” #${i.custPlayerNumber ?? '—'}` : ''}
                      </span>
                      <span className="font-semibold text-paper shrink-0">{formatNaira(i.lineTotal)}</span>
                    </li>
                  ))}
                  {o.items.length > 3 && (
                    <li className="text-xs text-muted-foreground">+ {o.items.length - 3} more item(s)</li>
                  )}
                </ul>
                <Separator className="bg-border" />
                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total</span>{' '}
                    <span className="font-extrabold text-lime text-lg">{formatNaira(o.total)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate(`#/track?token=${encodeURIComponent(o.trackingToken)}`)}
                    className="border-border text-paper hover:bg-white/5"
                    aria-label={`Track order ${o.orderNumber}`}
                  >
                    Track full order
                  </Button>
                </div>
                <div className="px-5 py-3 bg-surface text-xs text-muted-foreground border-t border-border">
                  {ORDER_STATUS_CUSTOMER_HINTS[o.status as keyof typeof ORDER_STATUS_CUSTOMER_HINTS] ?? ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // ---------------------------- NOT SIGNED IN --------------------------------
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-14">
      <div className="text-center mb-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-pine border border-lime/40 mb-4">
          <UserRound className="h-8 w-8 text-lime" aria-hidden />
        </div>
        <h1 className="font-display text-4xl font-bold uppercase text-paper">Sign In</h1>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base">
          No password needed — we email you a 6-digit code to verify it&apos;s really you.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-paper">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-lg border border-lime/40 bg-lime/10 px-4 py-3 text-sm text-paper">
          {notice}
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        {phase === 'email' ? (
          <form onSubmit={requestCode} aria-label="Request sign-in code">
            <Label htmlFor="acct-email">Email address</Label>
            <Input
              id="acct-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 h-12 bg-surface"
              required
            />
            <Button
              type="submit"
              size="lg"
              disabled={busy === 'sending' || email.trim().length < 5}
              className="mt-4 w-full h-12 bg-lime text-ink font-extrabold hover:bg-lime-deep"
            >
              {busy === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'Email me a code'}
            </Button>
            <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-lime shrink-0 mt-0.5" aria-hidden />
              <span>
                Your email is only used for your orders and sign-in codes. If you have ordered before with this
                email, your orders will appear here automatically after you sign in.
              </span>
            </div>
          </form>
        ) : (
          <div aria-label="Enter sign-in code">
            <button
              type="button"
              onClick={() => {
                setPhase('email')
                setCode('')
                setNotice('')
                setError('')
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-paper transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Use a different email
            </button>
            <p className="text-sm text-paper">
              Code sent to <span className="font-bold text-lime">{email.trim()}</span>
            </p>
            <Label htmlFor="acct-otp" className="mt-4 block">
              Enter the 6-digit code
            </Label>
            <InputOTP
              id="acct-otp"
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(v)
                if (v.length === 6) void verify(v)
              }}
              disabled={busy === 'verifying'}
              className="mt-2"
              aria-label="6-digit sign-in code"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-11 bg-surface border-border text-paper text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button
              onClick={() => void verify()}
              size="lg"
              disabled={busy === 'verifying' || code.length !== 6}
              className="mt-4 w-full h-12 bg-lime text-ink font-extrabold hover:bg-lime-deep"
            >
              {busy === 'verifying' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'Verify & sign in'}
            </Button>
            <div className="mt-4 text-center text-xs text-muted-foreground">
              {resendIn > 0 ? (
                <span>Resend code in {resendIn}s…</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  className="font-semibold text-lime hover:text-lime-deep transition-colors"
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function OrderBadge({
  value,
  map,
  kind,
}: {
  value: string
  map: Record<string, string>
  kind: 'payment' | 'status'
}) {
  let cls = 'border-border text-paper'
  if (kind === 'payment') {
    if (value === 'PAID') cls = 'bg-lime text-ink border-0'
    else if (value === 'PAYMENT_PENDING') cls = 'bg-amber-400/90 text-ink border-0'
    else if (value === 'REFUNDED') cls = 'bg-paper text-ink border-0'
    else cls = 'bg-amber-400/15 text-amber-200 border border-amber-400/40'
  } else {
    if (value === 'CANCELLED') cls = 'bg-destructive/80 text-white border-0'
    else if (value === 'COMPLETED') cls = 'bg-lime text-ink border-0'
    else if (value === 'CONFIRMED' || value === 'PROCESSING') cls = 'bg-pine text-paper border-0'
    else if (value === 'AWAITING_OWNER_CONFIRMATION') cls = 'bg-amber-400/15 text-amber-200 border border-amber-400/40'
  }
  return <Badge className={`${cls} font-extrabold text-[10px]`}>{map[value] ?? value}</Badge>
}
