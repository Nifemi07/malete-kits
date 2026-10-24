'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { api } from '@/lib/client-utils'

interface LogRow {
  id: string
  channel: string
  recipient: string
  status: string
  provider: string | null
  attempts: number
  error: string | null
  createdAt: string
  order: { orderNumber: string; customerName: string }
}

const STATUS_STYLE: Record<string, string> = {
  SENT: 'bg-lime/15 text-lime',
  FAILED: 'bg-destructive/15 text-red-300',
  PENDING: 'bg-amber-400/15 text-amber-300',
}

export function NotificationsTab() {
  const [logs, setLogs] = useState<LogRow[] | null>(null)
  const [status, setStatus] = useState('ALL')
  const [retrying, setRetrying] = useState<string | null>(null)

  const load = useCallback(() => {
    setLogs(null)
    const sp = new URLSearchParams()
    if (status !== 'ALL') sp.set('status', status)
    api<{ logs: LogRow[] }>(`/api/admin/notifications?${sp.toString()}`)
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]))
  }, [status])

  useEffect(load, [load])

  const retry = async (logId: string) => {
    setRetrying(logId)
    try {
      await api('/api/admin/notifications', { method: 'POST', body: JSON.stringify({ logId }) })
      toast.success('Notification retry attempted — check the new status')
      load()
    } catch (err) {
      // Retry endpoint returns the provider error as 502 — show it honestly
      toast.error(err instanceof Error ? err.message : 'Retry failed', { duration: 8000 })
      load()
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-5">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-surface sm:w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All notifications</SelectItem>
            <SelectItem value="FAILED">Failed only</SelectItem>
            <SelectItem value="PENDING">Pending only</SelectItem>
            <SelectItem value="SENT">Sent only</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" className="border-border text-paper hover:bg-white/5" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-surface/60 p-4 text-xs text-muted-foreground leading-relaxed mb-5">
        <strong className="text-paper">How delivery works:</strong> every order triggers (1) a customer confirmation email
        via Brevo and (2) an automated WhatsApp to the store via Meta Cloud API. If credentials aren&apos;t configured —
        or a provider fails — the attempt is logged here as FAILED and the order is NEVER lost. Use the retry button once
        credentials are ready. The WhatsApp click-to-chat links always work without credentials.
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-paper/70">When</TableHead>
              <TableHead className="text-paper/70">Order</TableHead>
              <TableHead className="text-paper/70">Channel</TableHead>
              <TableHead className="text-paper/70">Recipient</TableHead>
              <TableHead className="text-paper/70">Status</TableHead>
              <TableHead className="text-paper/70">Detail</TableHead>
              <TableHead className="text-right text-paper/70">Retry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs === null ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No notification logs.</TableCell></TableRow>
            ) : (
              logs.map((l) => (
                <TableRow key={l.id} className="border-border hover:bg-white/[0.03]">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-lime">{l.order.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border text-paper/80 text-[10px]">{l.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-paper/80 max-w-40 truncate">{l.recipient}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_STYLE[l.status]} border-0 font-bold text-[10px]`}>{l.status}</Badge>
                    <div className="text-[10px] text-muted-foreground mt-0.5">×{l.attempts} attempt{l.attempts === 1 ? '' : 's'}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-64">
                    <span className="line-clamp-2 break-words">{l.error ?? l.provider ?? '—'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status !== 'SENT' && (
                      <Button size="sm" variant="outline" disabled={retrying === l.id} className="border-border text-paper hover:bg-white/5 h-8" onClick={() => retry(l.id)}>
                        <RotateCcw className={`h-3.5 w-3.5 mr-1 ${retrying === l.id ? 'animate-spin' : ''}`} aria-hidden /> Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {logs?.some((l) => l.status === 'FAILED') && (
        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          Failed notifications usually mean provider credentials are missing or wrong. Check Settings → Integrations and the README env guide.
        </p>
      )}
    </div>
  )
}
