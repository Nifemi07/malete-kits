'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check, Info, Ruler, Sparkles, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { api, formatNaira, JERSEY_TYPE_LABELS, KIT_LABELS, type ProductDetail } from '@/lib/client-utils'
import { useCart, cartLineKey } from '@/lib/cart-store'
import { useMeta } from '../meta-context'

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export function ProductView({ slug, onNavigate }: { slug: string; onNavigate: (r: string) => void }) {
  const { store } = useMeta()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [sizeId, setSizeId] = useState<string>('')
  const [jerseyType, setJerseyType] = useState<'FAN' | 'PLAYER'>('FAN')
  const [quantity, setQuantity] = useState(1)
  const [customize, setCustomize] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')

  const addItem = useCart((s) => s.addItem)

  useEffect(() => {
    // Component is keyed by slug (see page.tsx) so state is fresh on every product.
    api<{ product: ProductDetail }>(`/api/products/${slug}`)
      .then((r) => {
        setProduct(r.product)
        const firstAvailable = r.product.variants.find((v) => v.stock > 0)
        if (firstAvailable) setSizeId(firstAvailable.id)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  const selectedVariant = useMemo(() => product?.variants.find((v) => v.id === sizeId) ?? null, [product, sizeId])
  const unitPrice = useMemo(() => {
    if (!product || !selectedVariant) return 0
    const base = selectedVariant.price ?? product.basePrice
    return jerseyType === 'PLAYER' ? base + product.playerVersionAdj : base
  }, [product, selectedVariant, jerseyType])

  const wantsCustomization = customize && product?.customizationAvailable && (playerName.trim().length > 0 || playerNumber.length > 0)
  const customizationFee = wantsCustomization ? store.customizationFee * quantity : 0
  const lineTotal = unitPrice * quantity + customizationFee

  const nameValid = !playerName.trim() || (/^[A-Za-z .'-]+$/.test(playerName.trim()) && playerName.trim().length <= 12)
  const numberValid = !playerNumber || (/^\d{1,2}$/.test(playerNumber) && Number(playerNumber) <= 99)

  const handleAdd = () => {
    if (!product || !selectedVariant) {
      toast.error('Select an available size first')
      return
    }
    if (wantsCustomization && (!nameValid || !numberValid)) {
      toast.error('Check the custom name (letters only, max 12) and number (0–99)')
      return
    }
    const line = {
      lineKey: cartLineKey(selectedVariant.id, jerseyType, {
        playerName: wantsCustomization && playerName.trim() ? playerName.trim().toUpperCase() : undefined,
        playerNumber: wantsCustomization && playerNumber !== '' ? Number(playerNumber) : undefined,
      }),
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      name: product.name,
      teamName: product.teamName,
      season: product.season,
      kitType: product.kitType,
      imageUrl: product.imageUrl,
      jerseyType,
      size: selectedVariant.size,
      quantity,
      estUnitPrice: unitPrice,
      estCustomizationFee: customizationFee,
      maxStock: selectedVariant.stock,
      customization: wantsCustomization
        ? {
            playerName: playerName.trim() ? playerName.trim().toUpperCase() : undefined,
            playerNumber: playerNumber !== '' ? Number(playerNumber) : undefined,
          }
        : undefined,
    }
    const { merged } = addItem(line)
    toast.success(merged ? 'Cart updated — quantity increased' : 'Added to cart', {
      description: `${product.name} · Size ${selectedVariant.size}`,
      action: { label: 'View cart', onClick: () => onNavigate('#/cart') },
    })
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 text-center">
        <div className="font-display text-4xl font-bold uppercase text-paper">Kit not found</div>
        <p className="mt-3 text-muted-foreground">This jersey may have sold out or been retired.</p>
        <Button className="mt-6 bg-lime text-ink font-bold hover:bg-lime-deep" onClick={() => onNavigate('#/shop')}>
          Back to shop
        </Button>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-[4/5] rounded-2xl bg-surface" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3 bg-surface" />
            <Skeleton className="h-6 w-1/3 bg-surface" />
            <Skeleton className="h-24 bg-surface" />
            <Skeleton className="h-40 bg-surface" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <Link
        href="#/shop"
        onClick={(e) => {
          e.preventDefault()
          onNavigate('#/shop')
        }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-lime transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back to shop
      </Link>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface jersey-shadow">
          {product.imageUrl ? (
             
            <img src={product.imageUrl} alt={product.name} className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div className="aspect-[4/5] grid place-items-center text-muted-foreground">No image</div>
          )}
          {product.badge && (
            <span className="absolute left-4 top-4 rounded-md bg-lime px-2.5 py-1 text-xs font-extrabold tracking-widest uppercase text-ink">
              {product.badge.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Details + options */}
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-pine hover:bg-pine text-paper border-0">{product.teamName}</Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {KIT_LABELS[product.kitType] ?? product.kitType} · {product.season}
            </Badge>
            {product.league && <span className="text-xs text-muted-foreground">{product.league}</span>}
          </div>

          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold uppercase leading-tight text-paper">
            {product.name}
          </h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-lime">{formatNaira(unitPrice)}</span>
            {jerseyType === 'PLAYER' && (
              <span className="text-sm text-muted-foreground line-through">{formatNaira(selectedVariant?.price ?? product.basePrice)}</span>
            )}
          </div>

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Jersey type */}
          <div className="mt-7">
            <Label className="text-xs font-bold tracking-widest uppercase text-paper/80">Jersey type</Label>
            <div className="mt-2.5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Jersey type">
              {(['FAN', 'PLAYER'] as const).map((t) => {
                const price = t === 'PLAYER' ? (selectedVariant?.price ?? product.basePrice) + product.playerVersionAdj : selectedVariant?.price ?? product.basePrice
                const selected = jerseyType === t
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setJerseyType(t)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected ? 'border-lime bg-lime/10 lime-glow' : 'border-border bg-surface hover:border-paper/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${selected ? 'text-lime' : 'text-paper'}`}>{JERSEY_TYPE_LABELS[t]}</span>
                      {selected && <Check className="h-4 w-4 text-lime" aria-hidden />}
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-paper">{formatNaira(price)}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {t === 'FAN' ? 'Relaxed fit, great quality' : 'Slim match fit, pro-grade tech'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sizes */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold tracking-widest uppercase text-paper/80">Select size</Label>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Ruler className="h-3.5 w-3.5" aria-hidden /> True to size
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {[...product.variants]
                .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size))
                .map((v) => {
                  const out = v.stock <= 0
                  const selected = sizeId === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={out}
                      onClick={() => {
                        setSizeId(v.id)
                        setQuantity(1)
                      }}
                      aria-pressed={selected}
                      className={`min-w-14 rounded-lg border px-3.5 py-2.5 text-sm font-bold transition-all ${
                        out
                          ? 'cursor-not-allowed border-border bg-surface/50 text-muted-foreground/40 line-through'
                          : selected
                            ? 'border-lime bg-lime text-ink'
                            : 'border-border bg-surface text-paper hover:border-paper/40'
                      }`}
                      title={out ? 'Sold out' : `${v.stock} in stock`}
                    >
                      {v.size}
                    </button>
                  )
                })}
            </div>
            {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 4 && (
              <p className="mt-2 text-xs font-semibold text-amber-300">Only {selectedVariant.stock} left — order fast!</p>
            )}
          </div>

          {/* Customization */}
          {product.customizationAvailable && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4.5 w-4.5 text-lime" aria-hidden />
                  <div>
                    <div className="text-sm font-bold text-paper">Add name &amp; number</div>
                    <div className="text-xs text-muted-foreground">
                      Official-look printing · {formatNaira(store.customizationFee)} per shirt
                    </div>
                  </div>
                </div>
                <Switch checked={customize} onCheckedChange={setCustomize} aria-label="Enable customization" />
              </div>
              {customize && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pname" className="text-xs text-muted-foreground">Player name (max 12 letters)</Label>
                    <Input
                      id="pname"
                      value={playerName}
                      maxLength={12}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="E.g. OSIMHEN"
                      className="mt-1.5 bg-ink border-border uppercase"
                    />
                    {!nameValid && <p className="mt-1 text-xs text-destructive">Letters, spaces, . &apos; - only</p>}
                  </div>
                  <div>
                    <Label htmlFor="pnum" className="text-xs text-muted-foreground">Number (0–99)</Label>
                    <Input
                      id="pnum"
                      value={playerNumber}
                      inputMode="numeric"
                      maxLength={2}
                      onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="E.g. 9"
                      className="mt-1.5 bg-ink border-border"
                    />
                    {!numberValid && <p className="mt-1 text-xs text-destructive">0–99 only</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity + add to cart */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <div className="flex items-stretch rounded-lg border border-border bg-surface overflow-hidden h-13 shrink-0">
              <button
                type="button"
                className="px-4 text-paper hover:bg-white/5 text-xl font-bold disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="grid place-items-center w-12 text-paper font-bold" aria-live="polite">{quantity}</span>
              <button
                type="button"
                className="px-4 text-paper hover:bg-white/5 text-xl font-bold disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.min(selectedVariant?.stock ?? 1, 10, q + 1))}
                disabled={!selectedVariant || quantity >= Math.min(selectedVariant?.stock ?? 1, 10)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1 h-13 bg-lime text-ink font-extrabold text-base hover:bg-lime-deep disabled:opacity-50"
              onClick={handleAdd}
              disabled={!selectedVariant || selectedVariant.stock <= 0}
            >
              <ShoppingBag className="mr-2 h-5 w-5" aria-hidden />
              {selectedVariant && selectedVariant.stock > 0 ? `Add to cart · ${formatNaira(lineTotal)}` : 'Size unavailable'}
            </Button>
          </div>

          {/* Info accordions */}
          <Accordion type="single" collapsible className="mt-7">
            <AccordionItem value="delivery">
              <AccordionTrigger className="text-sm font-bold text-paper">Pickup &amp; delivery in Malete</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Pickup is free — collect around KWASU campus. Delivery within Malete is {formatNaira(store.deliveryFeeMalete)},
                and {formatNaira(store.deliveryFeeOther)} for areas outside Malete (confirmed by the owner). You&apos;ll choose
                this at checkout.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment">
              <AccordionTrigger className="text-sm font-bold text-paper">How payment works</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Order first — pay after we confirm availability. The owner sends payment details (bank transfer or cash on
                pickup) personally on WhatsApp. We never ask for card details and there is no online payment on this site.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="quality">
              <AccordionTrigger className="text-sm font-bold text-paper">Quality &amp; returns</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Every kit is inspected before handover. If there&apos;s a manufacturing fault, exchange it within 3 days
                unused — just bring your order number. Customized shirts can&apos;t be exchanged unless the print is faulty.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-lime/70" aria-hidden />
            Final prices are always confirmed by the store before payment — the total shown here is calculated from our
            standard rates.
          </p>
        </div>
      </div>
    </div>
  )
}
