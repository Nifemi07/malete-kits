'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Banknote, MessageCircle, Package, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, formatNaira, type ProductListItem } from '@/lib/client-utils'
import { ProductCard } from '../product-card'
import { useMeta } from '../meta-context'

export function HomeView({ onNavigate, onSearch }: { onNavigate: (r: string) => void; onSearch: (q: string) => void }) {
  const { store } = useMeta()
  const [featured, setFeatured] = useState<ProductListItem[] | null>(null)
  const [latest, setLatest] = useState<ProductListItem[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api<{ products: ProductListItem[] }>('/api/products?featured=1').then((r) => setFeatured(r.products)).catch(() => setFeatured([]))
    api<{ products: ProductListItem[] }>('/api/products?sort=newest').then((r) => setLatest(r.products.slice(0, 8))).catch(() => setLatest([]))
  }, [])

  return (
    <div>
      {/* ------------------------------- HERO ------------------------------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero.webp')" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/40" aria-hidden />
        <div className="absolute inset-0 stripe-bg opacity-60" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 lg:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime/40 bg-ink/70 px-3.5 py-1.5 text-xs font-bold tracking-widest uppercase text-lime backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Malete · Kwara State · 25/26 Season
            </div>
            <h1 className="mt-5 font-display text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-[0.95] text-paper text-balance">
              Wear Your Team.
              <br />
              <span className="text-lime">Rep Your Campus.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-paper/80">
              Premium club &amp; national team jerseys for KWASU students and the whole of Malete — with optional
              name &amp; number customization. Order online, we confirm on WhatsApp, you pay by transfer or cash.
              No online payment wahala.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="h-13 bg-lime text-ink font-extrabold hover:bg-lime-deep text-base px-7"
                onClick={() => onNavigate('#/shop')}
              >
                Shop Jerseys <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 border-paper/30 bg-ink/40 text-paper font-bold hover:bg-ink/60 hover:text-paper px-7 backdrop-blur"
                onClick={() => onNavigate('#/track')}
              >
                <Package className="mr-2 h-5 w-5" aria-hidden /> Track an Order
              </Button>
            </div>

            {/* search on hero */}
            <form
              className="mt-8 flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                onSearch(q)
              }}
              role="search"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Try 'Real Madrid', 'Nigeria', 'Serie A'…"
                  className="pl-10 h-12 bg-ink/70 border-paper/20 text-paper placeholder:text-paper/40 backdrop-blur"
                  aria-label="Search jerseys"
                />
              </div>
              <Button type="submit" className="h-12 bg-paper text-ink font-bold hover:bg-paper/90">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* --------------------------- CATEGORY TILES -------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 -mt-0 py-14" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="sr-only">Shop by category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Club Teams',
              desc: 'Madrid, Barça, Arsenal, Chelsea, United & more — 25/26 home and away kits.',
              route: '#/shop?type=CLUB',
              accent: 'from-pine/80',
            },
            {
              title: 'National Teams',
              desc: 'Super Eagles 🇳🇬, Argentina, Portugal, Brazil — wear your country with pride.',
              route: '#/shop?type=NATIONAL',
              accent: 'from-pine-2/80',
            },
          ].map((c) => (
            <Link
              key={c.route}
              href={c.route}
              onClick={(e) => {
                e.preventDefault()
                onNavigate(c.route)
              }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all hover:border-lime/40"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${c.accent} to-transparent opacity-40 group-hover:opacity-70 transition-opacity`} aria-hidden />
              <div className="relative">
                <div className="font-display text-3xl sm:text-4xl font-bold uppercase text-paper">{c.title}</div>
                <p className="mt-2 text-sm text-paper/70 max-w-sm">{c.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-lime">
                  Browse kits <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------- FEATURED ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-14" aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-lime">Hand-picked heat</div>
            <h2 id="featured-heading" className="font-display text-3xl sm:text-4xl font-bold uppercase text-paper mt-1">
              Featured Kits
            </h2>
          </div>
          <Button variant="ghost" className="text-lime hover:text-lime hover:bg-lime/10 font-bold" onClick={() => onNavigate('#/shop')}>
            View all <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {featured === null
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl bg-surface" />)
            : featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} onOpen={() => onNavigate(`#/product/${p.slug}`)} />)}
          {featured?.length === 0 && <p className="text-muted-foreground col-span-full">Jerseys coming right up — check again shortly.</p>}
        </div>
      </section>

      {/* ---------------------------- HOW IT WORKS --------------------------- */}
      <section className="border-y border-border bg-surface/50 stripe-bg" aria-labelledby="how-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold tracking-widest uppercase text-lime">Simple &amp; scam-free</div>
            <h2 id="how-heading" className="font-display text-3xl sm:text-4xl font-bold uppercase text-paper mt-1">
              How Ordering Works
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              We don&apos;t collect online payments. You order first, we confirm what&apos;s available, then you pay —
              the way students actually prefer it.
            </p>
          </div>
          <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Search, step: '01', title: 'Pick Your Kit', text: 'Choose team, kit, size — add your name & number if you want customization.' },
              { icon: MessageCircle, step: '02', title: 'We Confirm on WhatsApp', text: 'We verify availability and reply to you personally with the total.' },
              { icon: Banknote, step: '03', title: 'Pay Transfer or Cash', text: 'Transfer to our account or pay cash on pickup. We verify before processing.' },
              { icon: Package, step: '04', title: 'Pickup or Delivery', text: 'Collect around Malete / KWASU, or get it delivered to your hostel.' },
            ].map((s) => (
              <li key={s.step} className="relative rounded-xl border border-border bg-card p-6">
                <span className="absolute right-5 top-4 font-display text-4xl font-bold text-lime/15" aria-hidden>{s.step}</span>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-pine text-lime mb-4">
                  <s.icon className="h-5.5 w-5.5" aria-hidden />
                </div>
                <div className="font-bold text-paper">{s.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------ NEWEST ------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14" aria-labelledby="new-heading">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-lime">Fresh restock</div>
            <h2 id="new-heading" className="font-display text-3xl sm:text-4xl font-bold uppercase text-paper mt-1">
              New In
            </h2>
          </div>
          <Button variant="ghost" className="text-lime hover:text-lime hover:bg-lime/10 font-bold" onClick={() => onNavigate('#/shop?sort=newest')}>
            View all <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {latest === null
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl bg-surface" />)
            : latest.map((p) => <ProductCard key={p.id} product={p} onOpen={() => onNavigate(`#/product/${p.slug}`)} />)}
        </div>
      </section>

      {/* ---------------------------- PROMO BANNER --------------------------- */}
      {store.promoCode && store.promoPercent > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16" aria-label="Promotion">
          <div className="relative overflow-hidden rounded-2xl border border-lime/30 bg-gradient-to-r from-pine via-pine to-ink p-8 sm:p-10">
            <div className="absolute inset-0 stripe-bg" aria-hidden />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1 text-xs font-extrabold tracking-widest uppercase text-ink">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Student promo
                </div>
                <div className="mt-3 font-display text-3xl sm:text-4xl font-bold uppercase text-paper">
                  {store.promoPercent}% off with code <span className="text-lime">{store.promoCode}</span>
                </div>
                <p className="mt-2 text-sm text-paper/75 max-w-lg">
                  KWASU students&apos; welcome offer — apply the code at checkout. Applies to the jersey subtotal
                  (customization &amp; delivery excluded).
                </p>
              </div>
              <Button size="lg" className="h-13 bg-lime text-ink font-extrabold hover:bg-lime-deep shrink-0" onClick={() => onNavigate('#/shop')}>
                Grab Yours
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
