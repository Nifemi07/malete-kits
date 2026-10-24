'use client'

import { useState } from 'react'
import { Clock, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import { waLink } from '@/lib/client-utils'
import { useMeta } from '../meta-context'

export function ContactView() {
  const { store } = useMeta()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  const sendViaWhatsApp = () => {
    if (!store.whatsappNumber) {
      toast.error('WhatsApp number not configured yet — please check back soon.')
      return
    }
    if (message.trim().length < 4) {
      toast.error('Type a short message first')
      return
    }
    const text = `Hello MALÈTE KITS!${name.trim() ? ` I'm ${name.trim()}.` : ''} ${message.trim()}`
    window.open(waLink(store.whatsappNumber, text), '_blank')
  }

  const faqs = [
    {
      q: 'How do I pay for my order?',
      a: 'You pay AFTER the owner confirms your order — by bank transfer to the account we provide or cash on pickup/delivery. There is no online payment on this website, and we never ask for your card or banking PIN.',
    },
    {
      q: 'How long does confirmation take?',
      a: 'Usually within a few hours during opening hours (Mon–Sat). You will be contacted on WhatsApp or by phone with your total and payment details.',
    },
    {
      q: 'Can I get my name and a number printed?',
      a: `Yes! Most jerseys support customization for ${store.customizationFee > 0 ? `₦${store.customizationFee.toLocaleString('en-NG')}` : 'a small fee'} per shirt. Add it on the product page before adding to cart. Printed names use the official-style font.`,
    },
    {
      q: 'Where is pickup in Malete?',
      a: 'The exact pickup point around KWASU/Malete is shared when your order is confirmed. You can also get delivery to your hostel or lodge within Malete for a small fee.',
    },
    {
      q: 'What if my size is out of stock?',
      a: 'Message us on WhatsApp — we restock frequently and can tell you when your size will be back, or suggest an alternative kit in your size.',
    },
    {
      q: 'Can I return or exchange a jersey?',
      a: 'Manufacturing faults can be exchanged within 3 days, unused, with your order number. Customized (printed) shirts can only be exchanged if the print itself is faulty.',
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase text-paper">Contact &amp; Support</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Questions about a kit, your size, or an order? WhatsApp is the fastest way to reach us.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* WhatsApp card */}
        <div className="rounded-2xl border border-lime/30 bg-gradient-to-br from-pine/60 to-card p-7">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#25D366] text-ink">
            <MessageCircle className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold uppercase text-paper">Chat on WhatsApp</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Fastest replies during opening hours. Ask about stock, sizes, customization, or your order status.
          </p>
          {store.whatsappNumber ? (
            <a href={waLink(store.whatsappNumber, 'Hello MALÈTE KITS! I have a question.')} target="_blank" rel="noreferrer" className="mt-5 inline-block">
              <Button size="lg" className="h-12 bg-[#25D366] text-ink font-extrabold hover:bg-[#1FB857]">
                <MessageCircle className="mr-2 h-5 w-5" aria-hidden /> Open WhatsApp chat
              </Button>
            </a>
          ) : (
            <p className="mt-5 text-sm text-paper/70">WhatsApp will be available shortly.</p>
          )}

          <div className="mt-6 space-y-2.5 text-sm text-paper/80">
            {store.storeAddress && (
              <div className="flex items-start gap-2.5"><MapPin className="h-4 w-4 mt-0.5 text-lime" aria-hidden /> {store.storeAddress}</div>
            )}
            {store.openingHours && (
              <div className="flex items-start gap-2.5"><Clock className="h-4 w-4 mt-0.5 text-lime" aria-hidden /> {store.openingHours}</div>
            )}
            {store.supportEmail && (
              <div className="flex items-start gap-2.5"><Phone className="h-4 w-4 mt-0.5 text-lime" aria-hidden /> {store.supportEmail}</div>
            )}
            <div className="flex items-start gap-2.5"><ShieldCheck className="h-4 w-4 mt-0.5 text-lime" aria-hidden /> Pay only after availability confirmation — never before.</div>
          </div>
        </div>

        {/* Quick message card */}
        <div className="rounded-2xl border border-border bg-card p-7">
          <h2 className="font-display text-2xl font-bold uppercase text-paper">Quick message</h2>
          <p className="mt-2 text-sm text-muted-foreground">Type your question and we&apos;ll open WhatsApp with it ready to send.</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="cname">Your name</Label>
              <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina" className="mt-1.5 bg-surface" />
            </div>
            <div>
              <Label htmlFor="cmsg">Message</Label>
              <Textarea id="cmsg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Do you have Real Madrid home size L in stock?" className="mt-1.5 min-h-28 bg-surface" />
            </div>
            <Button size="lg" className="w-full h-12 bg-lime text-ink font-extrabold hover:bg-lime-deep" onClick={sendViaWhatsApp}>
              <MessageCircle className="mr-2 h-5 w-5" aria-hidden /> Send via WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="font-display text-3xl font-bold uppercase text-paper mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-5">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-sm sm:text-base font-bold text-paper text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}
