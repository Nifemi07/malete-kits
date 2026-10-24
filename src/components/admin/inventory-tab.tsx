'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { api, formatNaira } from '@/lib/client-utils'

interface AdminProduct {
  id: string
  slug: string
  name: string
  teamName: string
  kitType: string
  season: string
  basePrice: number
  imageUrl: string | null
  category: { name: string; type: string }
  variants: Array<{ id: string; size: string; stock: number; sku: string }>
}

export function InventoryTab() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const load = useCallback(() => {
    api<{ products: AdminProduct[] }>('/api/admin/products')
      .then((r) => {
        setProducts(r.products)
        setEdits({})
      })
      .catch(() => setProducts([]))
  }, [])

  useEffect(load, [load])

  const dirty = Object.entries(edits).filter(([, v]) => v !== undefined)
  const hasEdits = dirty.length > 0

  const save = async () => {
    if (!hasEdits) return
    setSaving(true)
    try {
      const updates = dirty.map(([variantId, stock]) => ({ variantId, stock }))
      await api('/api/admin/products/stock', { method: 'PATCH', body: JSON.stringify({ updates }) })
      toast.success(`Stock updated for ${updates.length} size${updates.length === 1 ? '' : 's'}`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const filtered = (products ?? []).filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.teamName.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-5">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter products…"
          className="bg-surface sm:max-w-xs"
          aria-label="Filter products"
        />
        <div className="flex-1" />
        {hasEdits && (
          <Button onClick={save} disabled={saving} className="bg-lime text-ink font-extrabold hover:bg-lime-deep">
            <Save className="mr-2 h-4 w-4" aria-hidden /> Save {dirty.length} change{dirty.length === 1 ? '' : 's'}
          </Button>
        )}
      </div>

      {products === null ? (
        <p className="text-muted-foreground py-10 text-center">Loading inventory…</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                {p.imageUrl ? (
                   
                  <img src={p.imageUrl} alt="" className="h-14 w-12 rounded-md object-cover border border-border" />
                ) : (
                  <div className="grid h-14 w-12 place-items-center rounded-md bg-surface"><Package className="h-5 w-5 text-muted-foreground" aria-hidden /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-paper text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.category.name} · {formatNaira(p.basePrice)} · SKU base {p.slug}
                  </div>
                </div>
                <Badge variant="outline" className="border-border text-muted-foreground shrink-0">
                  {p.variants.reduce((s, v) => s + (edits[v.id] ?? v.stock), 0)} in stock
                </Badge>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {p.variants.map((v) => {
                  const current = edits[v.id] ?? v.stock
                  const changed = edits[v.id] !== undefined && edits[v.id] !== v.stock
                  return (
                    <label key={v.id} className={`rounded-lg border p-2 text-center transition-colors ${changed ? 'border-lime bg-lime/5' : 'border-border bg-surface'}`}>
                      <span className="block text-[10px] font-bold tracking-wider text-muted-foreground">{v.size}</span>
                      <Input
                        type="number"
                        min={0}
                        max={999}
                        value={current}
                        onChange={(e) => setEdits((s) => ({ ...s, [v.id]: Math.max(0, Math.min(999, Number(e.target.value) || 0)) }))}
                        className={`mt-1 h-8 text-center bg-ink border-border px-1 ${changed ? 'text-lime font-bold' : 'text-paper'}`}
                        aria-label={`Stock for ${p.name} size ${v.size}`}
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-10">No products match.</p>}
        </div>
      )}
    </div>
  )
}
