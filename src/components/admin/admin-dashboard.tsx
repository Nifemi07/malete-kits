'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BadgeDollarSign,
  Clock,
  Inbox,
  LogOut,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Store,
  Truck,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/client-utils'
import { OrdersTab } from './orders-tab'
import { InventoryTab } from './inventory-tab'
import { NotificationsTab } from './notifications-tab'
import { SettingsTab } from './settings-tab'

export interface AdminSession {
  email: string
  name: string
  role: string
  sub?: string
}

export interface Integrations {
  email: { provider: string; configured: boolean; hint: string }
  whatsapp: { provider: string; configured: boolean; hint: string }
}

interface Stats {
  total: number
  awaitingConfirmation: number
  awaitingPayment: number
  paid: number
  processing: number
  readyForPickup: number
  outForDelivery: number
  completed: number
  paymentPending: number
  paidRevenue: number
}

interface StatsResponse {
  stats: Stats
  recent7Days: { count: number; revenue: number }
}

export function AdminDashboard({
  admin,
  integrations,
  onLogout,
  onRefreshSession,
}: {
  admin: AdminSession
  integrations: Integrations | null
  onLogout: () => void
  onRefreshSession: () => void
}) {
  const [stats, setStats] = useState<StatsResponse | null>(null)

  const loadStats = useCallback(() => {
    api<StatsResponse>('/api/admin/stats')
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  useEffect(loadStats, [loadStats])

  const cards: Array<{ label: string; value: number | undefined; icon: React.ComponentType<{ className?: string }>; accent?: boolean }> = [
    { label: 'Total orders', value: stats?.stats.total, icon: Store },
    { label: 'New — awaiting confirmation', value: stats?.stats.awaitingConfirmation, icon: Inbox, accent: true },
    { label: 'Awaiting payment', value: stats?.stats.awaitingPayment, icon: Clock },
    { label: 'Paid', value: stats?.stats.paid, icon: Wallet },
    { label: 'Processing', value: stats?.stats.processing, icon: RefreshCw },
    { label: 'Ready for pickup', value: stats?.stats.readyForPickup, icon: PackageCheck },
    { label: 'Out for delivery', value: stats?.stats.outForDelivery, icon: Truck },
    { label: 'Completed', value: stats?.stats.completed, icon: ShoppingCart },
  ]

  return (
    <div className="min-h-screen bg-ink flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Admin header */}
      <header className="sticky top-0 z-40 border-b border-border bg-ink/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-3">
          { }
          <img src="/mk-icon.png" alt="" className="h-8 w-8 rounded-md border border-lime/40" />
          <div className="min-w-0">
            <div className="font-display text-lg font-bold tracking-[0.15em] uppercase text-paper leading-none">
              Malète<span className="text-lime"> Kits</span> <span className="text-muted-foreground text-xs normal-case tracking-normal font-sans font-medium">· Owner Dashboard</span>
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-48">{admin.email}</span>
          <Button variant="ghost" size="icon" onClick={onRefreshSession} className="text-muted-foreground hover:text-lime h-10 w-10" aria-label="Refresh session">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout} className="border-border text-paper hover:bg-white/5">
            <LogOut className="h-4 w-4 mr-1.5" aria-hidden /> Sign out
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8" aria-label="Order statistics">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border p-4 transition-colors ${
                c.accent && (c.value ?? 0) > 0 ? 'border-lime/50 bg-lime/5' : 'border-border bg-card'
              }`}
            >
              <c.icon className={`h-4.5 w-4.5 mb-2.5 ${c.accent && (c.value ?? 0) > 0 ? 'text-lime' : 'text-muted-foreground'}`} />
              <div className={`text-2xl font-extrabold ${c.accent && (c.value ?? 0) > 0 ? 'text-lime' : 'text-paper'}`}>
                {stats ? c.value ?? '—' : '…'}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground mt-0.5 leading-tight">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue strip */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 rounded-xl border border-border bg-gradient-to-r from-pine/50 to-card px-5 py-4 flex items-center gap-3">
            <BadgeDollarSign className="h-6 w-6 text-lime" aria-hidden />
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-paper/60">Verified revenue (PAID)</div>
              <div className="text-xl font-extrabold text-paper">
                {stats ? `₦${(stats.stats.paidRevenue ?? 0).toLocaleString('en-NG')}` : '…'}
              </div>
            </div>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-lime" aria-hidden />
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-paper/60">Last 7 days</div>
              <div className="text-xl font-extrabold text-paper">
                {stats ? `${stats.recent7Days.count} orders · ₦${stats.recent7Days.revenue.toLocaleString('en-NG')}` : '…'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" onValueChange={loadStats}>
          <TabsList className="bg-card mb-5 h-auto flex-wrap">
            <TabsTrigger value="orders" className="data-[state=active]:bg-lime data-[state=active]:text-ink">Orders</TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-lime data-[state=active]:text-ink">Products &amp; Stock</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-lime data-[state=active]:text-ink">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-lime data-[state=active]:text-ink">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="orders"><OrdersTab onChanged={loadStats} /></TabsContent>
          <TabsContent value="inventory"><InventoryTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab integrations={integrations} /></TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        MALÈTE KITS owner dashboard · all actions are audit-logged · no online payments are processed by this system
      </footer>
    </div>
  )
}
