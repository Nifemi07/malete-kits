'use client'

import { useCallback, useEffect, useState } from 'react'
import { LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api } from '@/lib/client-utils'
import { AdminDashboard, type AdminSession, type Integrations } from './admin-dashboard'

export function AdminApp() {
  const [admin, setAdmin] = useState<AdminSession | null>(null)
  const [integrations, setIntegrations] = useState<Integrations | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const check = useCallback(async () => {
    try {
      const r = await api<{ admin: AdminSession | null; integrations: Integrations | null }>('/api/admin/me')
      setAdmin(r.admin)
      setIntegrations(r.integrations)
    } catch {
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigningIn(true)
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) })
      toast.success('Welcome back!')
      check()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSigningIn(false)
    }
  }

  const logout = async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {})
    toast('Signed out')
    setAdmin(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink">
        <RefreshCw className="h-8 w-8 animate-spin text-lime" aria-hidden />
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink px-4" style={{ minHeight: '100dvh' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            { }
            <img src="/mk-icon.png" alt="" className="h-16 w-16 mx-auto rounded-xl border border-lime/40" />
            <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-[0.15em] text-paper">
              Malète<span className="text-lime"> Kits</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-lime" aria-hidden /> Store owner dashboard — authorized access only
            </p>
          </div>
          <form onSubmit={login} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@maletekits.com" className="mt-1.5 bg-surface" autoComplete="username" required />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 bg-surface" autoComplete="current-password" required />
            </div>
            <Button type="submit" size="lg" disabled={signingIn} className="w-full h-12 bg-lime text-ink font-extrabold hover:bg-lime-deep">
              {signingIn ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground text-center">
              Sessions expire after 12 hours. Login attempts are rate-limited. All order and payment actions are logged
              with your account.
            </p>
          </form>
        </div>
      </div>
    )
  }

  return <AdminDashboard admin={admin} integrations={integrations} onLogout={logout} onRefreshSession={check} />
}
