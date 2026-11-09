'use client'

import { useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/mk/header'
import { Footer } from '@/components/mk/footer'
import { MetaProvider } from '@/components/mk/meta-context'
import { HomeView } from '@/components/mk/views/home-view'
import { CatalogView, type CatalogQuery } from '@/components/mk/views/catalog-view'
import { ProductView } from '@/components/mk/views/product-view'
import { CartView } from '@/components/mk/views/cart-view'
import { CheckoutView } from '@/components/mk/views/checkout-view'
import { ConfirmationView } from '@/components/mk/views/confirmation-view'
import { TrackView } from '@/components/mk/views/track-view'
import { ContactView } from '@/components/mk/views/contact-view'
import { AccountView } from '@/components/mk/views/account-view'
import { AdminApp } from '@/components/admin/admin-app'

interface Route {
  path: string
  query: URLSearchParams
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs] = raw.split('?')
  return { path: path || '/', query: new URLSearchParams(qs ?? '') }
}

export default function Page() {
  const [route, setRoute] = useState<Route | null>(null)

  useEffect(() => {
    const update = () => setRoute(parseHash())
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  const navigate = useCallback((hashRoute: string) => {
    // Normalise then assign — triggers hashchange → re-render
    const target = hashRoute.startsWith('#') ? hashRoute : `#${hashRoute}`
    if (window.location.hash === target) {
      setRoute(parseHash())
    } else {
      window.location.hash = target
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  // ------------------------------- BOOT -------------------------------------
  if (route === null) {
    return (
      <div className="min-h-screen bg-ink grid place-items-center" style={{ minHeight: '100dvh' }}>
        <div className="text-center">
          { }
          <img src="/mk-icon.png" alt="MALÈTE KITS" className="h-20 w-20 mx-auto rounded-2xl border border-lime/40 animate-pulse" />
          <p className="mt-4 font-display text-xl tracking-[0.2em] uppercase text-paper">
            Malète<span className="text-lime"> Kits</span>
          </p>
        </div>
      </div>
    )
  }

  // ------------------------------- ADMIN ------------------------------------
  if (route.path === '/admin') {
    return <AdminApp />
  }

  // ---------------------------- STOREFRONT ----------------------------------
  const isCheckout = route.path === '/checkout'
  const isConfirmation = route.path === '/order-confirmation'

  let view: React.ReactNode
  const productSlug = route.path.startsWith('/product/') ? route.path.slice('/product/'.length) : null
  switch (route.path) {
    case '/':
      view = <HomeView onNavigate={navigate} onSearch={(q) => navigate(`#/shop?q=${encodeURIComponent(q)}`)} />
      break
    case '/shop':
      view = (
        <CatalogView
          key={route.query.toString() || 'all'}
          query={{
            q: route.query.get('q') ?? undefined,
            type: route.query.get('type') ?? undefined,
            team: route.query.get('team') ?? undefined,
            season: route.query.get('season') ?? undefined,
            kit: route.query.get('kit') ?? undefined,
            sort: route.query.get('sort') ?? undefined,
          } satisfies CatalogQuery}
          onNavigate={navigate}
        />
      )
      break
    case '/cart':
      view = <CartView onNavigate={navigate} />
      break
    case '/checkout':
      view = <CheckoutView onNavigate={navigate} onOrderPlaced={() => undefined} />
      break
    case '/order-confirmation':
      view = <ConfirmationView onNavigate={navigate} />
      break
    case '/track':
      view = <TrackView initialToken={route.query.get('token') ?? undefined} onNavigate={navigate} />
      break
    case '/contact':
      view = <ContactView />
      break
    case '/account':
      view = <AccountView onNavigate={navigate} />
      break
    default:
      if (productSlug) {
        view = <ProductView key={productSlug} slug={productSlug} onNavigate={navigate} />
        break
      }
      view = (
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-5xl font-bold uppercase text-paper">Page not found</h1>
          <p className="mt-3 text-muted-foreground">That page doesn&apos;t exist — let&apos;s get you back to the jerseys.</p>
          <button
            className="mt-6 inline-flex h-12 items-center rounded-md bg-lime px-6 font-extrabold text-ink hover:bg-lime-deep"
            onClick={() => navigate('#/')}
          >
            Go home
          </button>
        </div>
      )
  }

  return (
    <MetaProvider>
      <div className="min-h-screen flex flex-col bg-background" style={{ minHeight: '100dvh' }}>
        {!isCheckout && !isConfirmation && (
          <Header
            onNavigate={navigate}
            currentRoute={`#${route.path}`}
            onSearch={(q) => navigate(`#/shop?q=${encodeURIComponent(q)}`)}
          />
        )}
        {isCheckout && (
          <div className="border-b border-border bg-ink/95">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center">
              <button onClick={() => navigate('#/')} className="font-display text-xl font-bold tracking-[0.18em] uppercase text-paper">
                Malète<span className="text-lime"> Kits</span>
              </button>
            </div>
          </div>
        )}
        {isConfirmation && (
          <div className="border-b border-border bg-ink/95">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center">
              <button onClick={() => navigate('#/')} className="font-display text-xl font-bold tracking-[0.18em] uppercase text-paper">
                Malète<span className="text-lime"> Kits</span>
              </button>
            </div>
          </div>
        )}
        <main className="flex-1">{view}</main>
        <Footer onNavigate={navigate} />
      </div>
    </MetaProvider>
  )
}
