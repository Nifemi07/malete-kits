'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, SearchX, Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api, type ProductListItem } from '@/lib/client-utils'
import { useMeta } from '../meta-context'
import { ProductCard } from '../product-card'

export interface CatalogQuery {
  q?: string
  type?: string
  team?: string
  season?: string
  kit?: string
  sort?: string
}

export function CatalogView({ query, onNavigate }: { query: CatalogQuery; onNavigate: (r: string) => void }) {
  const { facets } = useMeta()
  const [products, setProducts] = useState<ProductListItem[] | null>(null)
  const [filters, setFilters] = useState<CatalogQuery>(query)
  const [searchText, setSearchText] = useState(query.q ?? '')

  const fetchProducts = useCallback(() => {
    const sp = new URLSearchParams()
    if (filters.q) sp.set('q', filters.q)
    if (filters.type) sp.set('type', filters.type)
    if (filters.team) sp.set('team', filters.team)
    if (filters.season) sp.set('season', filters.season)
    if (filters.kit) sp.set('kit', filters.kit)
    if (filters.sort) sp.set('sort', filters.sort)
    api<{ products: ProductListItem[] }>(`/api/products?${sp.toString()}`)
      .then((r) => setProducts(r.products))
      .catch(() => setProducts([]))
  }, [filters])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => v && k !== 'sort').length,
    [filters]
  )

  const setFilter = (key: keyof CatalogQuery, value: string) => {
    const next = { ...filters, [key]: value || undefined }
    if (key === 'q') next.q = value || undefined
    setFilters(next)
    // reflect in URL hash (without pushing history entries)
    const sp = new URLSearchParams()
    Object.entries(next).forEach(([k, v]) => v && sp.set(k, v))
    const qs = sp.toString()
    window.history.replaceState(null, '', `#/shop${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col gap-2 mb-8">
        <div className="text-xs font-bold tracking-widest uppercase text-lime">The racks</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase text-paper">Shop Jerseys</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
          Every shirt is quality-checked before pickup. Prices include the shirt only — customization and delivery are
          calculated transparently at checkout.
        </p>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card p-4 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-lime" aria-hidden />
          <span className="text-sm font-bold text-paper">Filters</span>
          {activeFilterCount > 0 && <Badge variant="secondary" className="bg-pine text-paper border-0">{activeFilterCount} active</Badge>}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => setFilters({ sort: filters.sort })}>
              Clear all
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setFilter('q', searchText)}
              onBlur={() => filters.q !== searchText && setFilter('q', searchText)}
              placeholder="Search…"
              className="pl-9 h-11 bg-surface"
              aria-label="Search jerseys"
            />
          </div>
          <Select value={filters.type ?? 'ALL'} onValueChange={(v) => setFilter('type', v === 'ALL' ? '' : v)}>
            <SelectTrigger className="h-11 bg-surface" aria-label="Category type">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="CLUB">Club Teams</SelectItem>
              <SelectItem value="NATIONAL">National Teams</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.team ?? 'ALL'} onValueChange={(v) => setFilter('team', v === 'ALL' ? '' : v)}>
            <SelectTrigger className="h-11 bg-surface" aria-label="Team">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="ALL">All Teams</SelectItem>
              {facets.teams.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.kit ?? 'ALL'} onValueChange={(v) => setFilter('kit', v === 'ALL' ? '' : v)}>
            <SelectTrigger className="h-11 bg-surface" aria-label="Kit type">
              <SelectValue placeholder="Kit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Home / Away / Third</SelectItem>
              <SelectItem value="HOME">Home</SelectItem>
              <SelectItem value="AWAY">Away</SelectItem>
              <SelectItem value="THIRD">Third</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sort ?? 'FEATURED'} onValueChange={(v) => setFilter('sort', v === 'FEATURED' ? '' : v)}>
            <SelectTrigger className="h-11 bg-surface" aria-label="Sort">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEATURED">Featured</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low → High</SelectItem>
              <SelectItem value="price_desc">Price: High → Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {products === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl bg-surface" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border py-20 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
          <div className="font-display text-2xl font-semibold uppercase text-paper">No jerseys found</div>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Try a different search or clear some filters. New stock lands every week — or ping us on WhatsApp to request a kit.
          </p>
          <Button className="mt-5 bg-lime text-ink font-bold hover:bg-lime-deep" onClick={() => onNavigate('#/contact')}>
            Request a kit
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            <span className="font-bold text-paper">{products.length}</span> kit{products.length === 1 ? '' : 's'} found
            {filters.q ? <> for &ldquo;<span className="text-paper">{filters.q}</span>&rdquo;</> : ''}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={() => onNavigate(`#/product/${p.slug}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
