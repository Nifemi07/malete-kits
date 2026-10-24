'use client'

import Link from 'next/link'
import { MapPin, Clock, Mail, ShieldCheck, Banknote, PackageCheck } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useMeta } from './meta-context'

interface FooterProps {
  onNavigate: (route: string) => void
}

export function Footer({ onNavigate }: FooterProps) {
  const { store } = useMeta()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-ink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {/* Trust strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: ShieldCheck, title: 'No online payment', text: 'Pay only after we confirm availability — transfer or cash.' },
            { icon: Banknote, title: 'Verified payments', text: 'Every payment is personally verified by the owner. No screenshots-as-proof games.' },
            { icon: PackageCheck, title: 'Malete pickup & delivery', text: 'Collect around KWASU campus or get it delivered to your hostel.' },
          ].map((t) => (
            <div key={t.title} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
              <t.icon className="h-5 w-5 text-lime shrink-0 mt-0.5" aria-hidden />
              <div>
                <div className="font-bold text-sm text-paper">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="font-display text-2xl font-bold tracking-[0.18em] uppercase text-paper">
              Malète<span className="text-lime"> Kits</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              The student-run football jersey store for KWASU and the whole of Malete. Club and national team shirts,
              customization with your name and number, and a simple order-first, pay-after-confirmation process.
            </p>
          </div>

          <nav aria-label="Footer">
            <div className="font-display text-sm font-semibold tracking-widest uppercase text-paper/80 mb-3">Shop</div>
            <ul className="space-y-2 text-sm">
              {[
                ['All Jerseys', '#/shop'],
                ['Club Teams', '#/shop?type=CLUB'],
                ['National Teams', '#/shop?type=NATIONAL'],
                ['Track Your Order', '#/track'],
                ['Contact & Support', '#/contact'],
              ].map(([label, route]) => (
                <li key={route}>
                  <Link
                    href={route}
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate(route)
                    }}
                    className="text-muted-foreground hover:text-lime transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <div className="font-display text-sm font-semibold tracking-widest uppercase text-paper/80 mb-3">Contact</div>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {store.whatsappNumber && (
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-paper">WhatsApp:</span>
                  <a
                    href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-lime transition-colors"
                  >
                    Chat with us
                  </a>
                </li>
              )}
              {store.storeAddress && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-lime/70" aria-hidden />
                  {store.storeAddress}
                </li>
              )}
              {store.openingHours && (
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-lime/70" aria-hidden />
                  {store.openingHours}
                </li>
              )}
              {store.supportEmail && (
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-lime/70" aria-hidden />
                  <a href={`mailto:${store.supportEmail}`} className="hover:text-lime transition-colors">
                    {store.supportEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-border" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {year} MALÈTE KITS · Malete, Kwara State, Nigeria</div>
          <div className="flex items-center gap-4">
            <span>No card data is collected on this site</span>
            <Link
              href="#/admin"
              onClick={(e) => {
                e.preventDefault()
                onNavigate('#/admin')
              }}
              className="hover:text-paper transition-colors"
              aria-label="Store admin login"
            >
              Store Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
