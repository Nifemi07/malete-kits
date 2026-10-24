'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, KeyRound, Save, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { api } from '@/lib/client-utils'

interface SettingsData {
  storeName: string
  whatsappNumber: string
  supportEmail: string | null
  storeAddress: string | null
  openingHours: string | null
  announcement: string | null
  bankName: string | null
  accountName: string | null
  accountNumber: string | null
  acceptedPaymentMethods: string | null
  cashInstructions: string | null
  paymentInstructions: string | null
  deliveryFeeMalete: number
  deliveryFeeOther: number
  customizationFee: number
  pickupFee: number
  promoCode: string | null
  promoPercent: number
  promoMaxNaira: number
}

export function SettingsTab({ integrations }: { integrations: { email: { configured: boolean; hint: string }; whatsapp: { configured: boolean; hint: string } } | null }) {
  const [s, setS] = useState<SettingsData | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api<{ settings: SettingsData }>('/api/admin/settings')
      .then((r) => setS(r.settings))
      .catch(() => setS(null))
  }, [])

  useEffect(load, [load])

  if (!s) return <p className="text-muted-foreground py-10 text-center">Loading settings…</p>

  const set = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => setS((prev) => (prev ? { ...prev, [k]: v } : prev))

  const save = async () => {
    if (!s) return
    setSaving(true)
    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          whatsappNumber: s.whatsappNumber ?? '',
          supportEmail: s.supportEmail ?? '',
          storeAddress: s.storeAddress ?? '',
          openingHours: s.openingHours ?? '',
          announcement: s.announcement ?? '',
          bankName: s.bankName ?? '',
          accountName: s.accountName ?? '',
          accountNumber: s.accountNumber ?? '',
          acceptedPaymentMethods: s.acceptedPaymentMethods ?? '',
          cashInstructions: s.cashInstructions ?? '',
          paymentInstructions: s.paymentInstructions ?? '',
          deliveryFeeMalete: s.deliveryFeeMalete,
          deliveryFeeOther: s.deliveryFeeOther,
          customizationFee: s.customizationFee,
          pickupFee: s.pickupFee,
          promoCode: s.promoCode ?? '',
          promoPercent: s.promoPercent,
          promoMaxNaira: s.promoMaxNaira,
        }),
      })
      toast.success('Settings saved')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const usingPlaceholderWa = s.whatsappNumber === '08012345678'

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Integrations status */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 font-display font-bold uppercase text-paper mb-3">
          <KeyRound className="h-4.5 w-4.5 text-lime" aria-hidden /> Integrations (env-based)
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3 rounded-lg bg-surface border border-border p-3">
            <div>
              <div className="font-bold text-paper">Email — Brevo</div>
              <p className="text-xs text-muted-foreground mt-0.5">{integrations?.email.hint}</p>
            </div>
            <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-extrabold ${integrations?.email.configured ? 'bg-lime text-ink' : 'bg-destructive/20 text-red-300'}`}>
              {integrations?.email.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg bg-surface border border-border p-3">
            <div>
              <div className="font-bold text-paper">WhatsApp — Meta Cloud API</div>
              <p className="text-xs text-muted-foreground mt-0.5">{integrations?.whatsapp.hint}</p>
            </div>
            <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-extrabold ${integrations?.whatsapp.configured ? 'bg-lime text-ink' : 'bg-destructive/20 text-red-300'}`}>
              {integrations?.whatsapp.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Click-to-chat WhatsApp links work without any credentials. Automated sending stays honestly disabled until the
            env vars exist and a test message succeeds.
          </p>
        </div>
      </section>

      {/* Store identity */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold uppercase text-paper"><Building2 className="h-4.5 w-4.5 text-lime" aria-hidden /> Store identity &amp; contact</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>WhatsApp number (customer contact)</Label>
            <Input value={s.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="08012345678" className="mt-1.5 bg-surface" />
            {usingPlaceholderWa && <p className="mt-1 text-xs text-amber-400 font-semibold">⚠ Placeholder — set your real WhatsApp number so customer links work.</p>}
          </div>
          <div>
            <Label>Support email</Label>
            <Input value={s.supportEmail ?? ''} onChange={(e) => set('supportEmail', e.target.value)} placeholder="hello@maletekits.com" className="mt-1.5 bg-surface" />
          </div>
          <div className="sm:col-span-2">
            <Label>Store address (shown in footer)</Label>
            <Input value={s.storeAddress ?? ''} onChange={(e) => set('storeAddress', e.target.value)} className="mt-1.5 bg-surface" />
          </div>
          <div>
            <Label>Opening hours</Label>
            <Input value={s.openingHours ?? ''} onChange={(e) => set('openingHours', e.target.value)} className="mt-1.5 bg-surface" />
          </div>
          <div>
            <Label>Announcement bar (top of site)</Label>
            <Input value={s.announcement ?? ''} onChange={(e) => set('announcement', e.target.value)} className="mt-1.5 bg-surface" maxLength={160} />
          </div>
        </div>
      </section>

      {/* Payment config */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold uppercase text-paper"><Wallet className="h-4.5 w-4.5 text-lime" aria-hidden /> Payment details (shown to customers after confirmation)</div>
        <p className="text-xs text-muted-foreground">
          These are shown on confirmation emails, the confirmation page, and order tracking. Leave empty to withhold
          payment details until you share them personally on WhatsApp — empty is the safe default.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Bank name</Label>
            <Input value={s.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} placeholder="e.g. GTBank" className="mt-1.5 bg-surface" />
          </div>
          <div>
            <Label>Account name</Label>
            <Input value={s.accountName ?? ''} onChange={(e) => set('accountName', e.target.value)} placeholder="e.g. Malète Kits Ent." className="mt-1.5 bg-surface" />
          </div>
          <div>
            <Label>Account number (10 digits)</Label>
            <Input value={s.accountNumber ?? ''} onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" className="mt-1.5 bg-surface" inputMode="numeric" />
          </div>
          <div className="sm:col-span-3">
            <Label>Accepted payment methods (display text)</Label>
            <Input value={s.acceptedPaymentMethods ?? ''} onChange={(e) => set('acceptedPaymentMethods', e.target.value)} placeholder="Bank transfer, Cash on pickup/delivery" className="mt-1.5 bg-surface" />
          </div>
          <div className="sm:col-span-2">
            <Label>Payment instructions shown to customers</Label>
            <Textarea value={s.paymentInstructions ?? ''} onChange={(e) => set('paymentInstructions', e.target.value)} className="mt-1.5 min-h-20 bg-surface text-sm" maxLength={600} />
          </div>
          <div>
            <Label>Cash payment instructions</Label>
            <Textarea value={s.cashInstructions ?? ''} onChange={(e) => set('cashInstructions', e.target.value)} className="mt-1.5 min-h-20 bg-surface text-sm" maxLength={400} />
          </div>
        </div>
      </section>

      {/* Fees & promo */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold uppercase text-paper"><Building2 className="h-4.5 w-4.5 text-lime" aria-hidden /> Fees &amp; promo</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            ['deliveryFeeMalete', 'Delivery — Malete (₦)'],
            ['deliveryFeeOther', 'Delivery — outside (₦)'],
            ['customizationFee', 'Customization (₦/shirt)'],
            ['pickupFee', 'Pickup fee (₦)'],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input
                type="number" min={0}
                value={s[k]}
                onChange={(e) => set(k, Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 bg-surface"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <Label>Promo code</Label>
            <Input value={s.promoCode ?? ''} onChange={(e) => set('promoCode', e.target.value.toUpperCase())} placeholder="KWASU10" className="mt-1.5 bg-surface" />
          </div>
          <div>
            <Label>Promo percent (0–50)</Label>
            <Input type="number" min={0} max={50} value={s.promoPercent} onChange={(e) => set('promoPercent', Math.min(50, Math.max(0, Number(e.target.value) || 0)))} className="mt-1.5 bg-surface" />
          </div>
          <div>
            <Label>Promo max discount (₦)</Label>
            <Input type="number" min={0} value={s.promoMaxNaira} onChange={(e) => set('promoMaxNaira', Math.max(0, Number(e.target.value) || 0))} className="mt-1.5 bg-surface" />
          </div>
        </div>
      </section>

      <div className="sticky bottom-4">
        <Button onClick={save} disabled={saving} size="lg" className="w-full h-13 bg-lime text-ink font-extrabold hover:bg-lime-deep">
          <Save className="mr-2 h-5 w-5" aria-hidden /> {saving ? 'Saving…' : 'Save all settings'}
        </Button>
      </div>
    </div>
  )
}
