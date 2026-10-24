'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Menu, Search, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/lib/cart-store'
import { useMeta } from '@/components/mk/meta-context'

interface HeaderProps {
  onNavigate: (route: string) => void
  currentRoute: string
  onSearch: (q: string) => void
}

const NAV = [
  { label: 'Home', route: '#/' },
  { label: 'Shop All', route: '#/shop' },
  { label: 'Club Kits', route: '#/shop?type=CLUB' },
  { label: 'National', route: '#/shop?type=NATIONAL' },
  { label: 'Track Order', route: '#/track' },
  { label: 'Contact', route: '#/contact' },
]

export function Header({ onNavigate, currentRoute, onSearch }: HeaderProps) {
  const items = useCart((s) => s.items)
  const { store } = useMeta()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  const go = (route: string) => {
    setOpen(false)
    onNavigate(route)
  }

  const isActive = (route: string) => {
    const path = route.split('?')[0]
    return currentRoute === path
  }

  return (
    <header className="sticky top-0 z-50">
      {store.announcement && (
        <div className="bg-pine text-paper/90 text-center text-[11px] sm:text-xs font-semibold tracking-wide py-1.5 px-4">
          {store.announcement}
        </div>
      )}
      <div
        className={`border-b border-border bg-ink/95 backdrop-blur-md transition-shadow ${
          scrolled ? 'shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)]' : ''
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-3">
            {/* Logo */}
            <Link
              href="#/"
              onClick={(e) => {
                e.preventDefault()
                onNavigate('#/')
              }}
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="MALÈTE KITS home"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-pine border border-lime/40 group-hover:border-lime transition-colors">
                { }
                <img src="/logo-mk.svg" alt="" className="h-6 w-6" />
              </span>
              <span className="font-display text-xl sm:text-2xl font-bold tracking-[0.18em] text-paper uppercase leading-none">
                Malète<span className="text-lime"> Kits</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="ml-6 hidden lg:flex items-center gap-1" aria-label="Main">
              {NAV.map((n) => (
                <Link
                  key={n.route}
                  href={n.route}
                  onClick={(e) => {
                    e.preventDefault()
                    onNavigate(n.route)
                  }}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    isActive(n.route)
                      ? 'text-lime bg-lime/10'
                      : 'text-paper/75 hover:text-paper hover:bg-white/5'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex-1" />

            {/* Desktop search */}
            <form
              className="hidden md:block relative w-56 xl:w-72"
              onSubmit={(e) => {
                e.preventDefault()
                onSearch(q)
              }}
              role="search"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search team or league…"
                className="pl-9 h-10 bg-surface border-border text-sm"
                aria-label="Search jerseys"
              />
            </form>

            {/* Cart */}
            <Link
              href="#/cart"
              onClick={(e) => {
                e.preventDefault()
                onNavigate('#/cart')
              }}
              className="relative grid h-11 w-11 place-items-center rounded-lg hover:bg-white/5 text-paper transition-colors"
              aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[11px] font-extrabold text-ink">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-paper hover:bg-white/5 h-11 w-11" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-ink border-border w-[300px] p-0">
                <SheetHeader className="border-b border-border p-5">
                  <SheetTitle className="font-display tracking-[0.18em] uppercase text-paper">
                    Malète<span className="text-lime"> Kits</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 p-4">
                  {NAV.map((n) => (
                    <Link
                      key={n.route}
                      href={n.route}
                      onClick={(e) => {
                        e.preventDefault()
                        go(n.route)
                      }}
                      className={`px-3 py-3 rounded-md font-semibold text-sm ${
                        isActive(n.route) ? 'text-lime bg-lime/10' : 'text-paper/80 hover:bg-white/5'
                      }`}
                    >
                      {n.label}
                    </Link>
                  ))}
                  <form
                    className="mt-3 relative"
                    onSubmit={(e) => {
                      e.preventDefault()
                      onSearch(q)
                      setOpen(false)
                    }}
                  >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jerseys…" className="pl-9 bg-surface" aria-label="Search jerseys" />
                  </form>
                  {store.whatsappNumber && (
                    <a
                      href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 rounded-md bg-pine px-3 py-3 text-sm font-bold text-paper"
                    >
                      <Phone className="h-4 w-4 text-lime" /> WhatsApp Us
                    </a>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
