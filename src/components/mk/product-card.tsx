'use client'

import Link from 'next/link'
import { Shirt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatNaira, KIT_LABELS, type ProductListItem } from '@/lib/client-utils'

const BADGE_STYLES: Record<string, string> = {
  BESTSELLER: 'bg-lime text-ink',
  NEW: 'bg-pine text-paper',
  PRE_ORDER: 'bg-paper text-ink',
  RESTOCK: 'bg-lime-deep text-ink',
}

export function ProductCard({ product, onOpen }: { product: ProductListItem; onOpen?: () => void }) {
  return (
    <Link
      href={`#/product/${product.slug}`}
      onClick={(e) => {
        e.preventDefault()
        onOpen?.()
      }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-lime/50 hover:shadow-[0_20px_50px_-20px_rgba(185,247,62,0.15)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`${product.name} — ${formatNaira(product.displayPrice)}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        {product.imageUrl ? (
           
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Shirt className="h-16 w-16" aria-hidden />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.badge && BADGE_STYLES[product.badge] && (
            <span className={`rounded-md px-2 py-1 text-[10px] font-extrabold tracking-widest uppercase ${BADGE_STYLES[product.badge]}`}>
              {product.badge.replace('_', ' ')}
            </span>
          )}
          {product.featured && !product.badge && (
            <span className="rounded-md bg-ink/85 px-2 py-1 text-[10px] font-extrabold tracking-widest uppercase text-lime backdrop-blur">
              Popular
            </span>
          )}
        </div>

        {!product.inStock && (
          <div className="absolute inset-0 grid place-items-center bg-ink/70 backdrop-blur-[2px]">
            <span className="rounded-md border border-paper/30 bg-ink/80 px-3 py-1.5 font-display text-sm font-semibold tracking-widest uppercase text-paper">
              Sold Out
            </span>
          </div>
        )}

        <span className="absolute bottom-3 right-3 rounded-md bg-ink/80 px-2.5 py-1 text-xs font-bold text-paper backdrop-blur border border-white/10">
          {KIT_LABELS[product.kitType] ?? product.kitType} · {product.season}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="text-[11px] font-bold tracking-widest uppercase text-lime/90">{product.teamName}</div>
        <div className="text-sm font-semibold text-paper leading-snug">{product.name}</div>
        <div className="mt-auto flex items-baseline justify-between pt-2">
          <div>
            <span className="text-lg font-extrabold text-paper">{formatNaira(product.displayPrice)}</span>
            {product.displayPrice !== product.basePrice && (
              <span className="ml-1 text-[11px] text-muted-foreground">from</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {product.inStock ? `Size XS–XXL` : 'Check back soon'}
          </span>
        </div>
      </div>
    </Link>
  )
}
