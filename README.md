# MALÈTE KITS — Football Jersey Store & Order-Management System

A production-ready e-commerce and order-management website for a student-focused football
jersey business in **Malete, Kwara State, Nigeria** (KWASU).

**Business model: NO online payment gateway.** Customers place orders on the website; the
order is saved, a confirmation email is queued, and the store owner is notified. The owner
personally confirms availability, provides payment instructions (transfer/cash), verifies
payment, and moves the order through fulfilment. Nothing is ever charged online.

---

## What's inside

| Area | Details |
|------|---------|
| Storefront | Homepage, catalog with search + filters (category/team/kit/sort), product pages with size & stock, jersey type (Fan/Player), name & number customization, cart, guest checkout, order confirmation with WhatsApp share, order tracking with status timeline, contact/FAQ |
| Order engine | Server-side re-pricing, atomic stock reservation, sequential order numbers (MK-1024, MK-1025, …), idempotency keys (no duplicate orders), status history, cancellation with automatic restock |
| Payments | Manual only: UNPAID → PAYMENT_PENDING → PAID → REFUNDED. Marking PAID **requires** a verification note + method; every change is audit-logged with admin identity + timestamp |
| Emails | Brevo HTTP API (optional). Branded HTML confirmation. Failures are logged, never fatal, retryable from the dashboard |
| WhatsApp | **Mode A** — wa.me click-to-chat links (always work, zero credentials). **Mode B** — optional automated notifications via Meta WhatsApp Cloud API |
| Admin | Secure dashboard: stats, order search/filters, status workflow, payment verification, internal notes, resend email, retry notifications, cancel/refund, inventory editor, store settings |
| Stack | Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma ORM · SQLite (dev) / PostgreSQL (prod) · custom JWT admin auth (scrypt + HMAC, httpOnly cookie) |

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment (see .env.example — real secrets go in .env)
cp .env.example .env

# 3. Create the database (SQLite in dev) + baseline migration
bun run db:push

# 4. Seed store data (27 jerseys, sizes, stock, admin user, settings)
bun run db:seed

# 5. Run the dev server
bun run dev        # http://localhost:3000
```

### Default admin login

| | |
|---|---|
| URL | `/#/admin` (or the “Store Login” link in the footer) |
| Email | `owner@maletekits.com` |
| Password | `MaleteAdmin@2026!` |

> ⚠️ Change the password immediately: set `ADMIN_PASSWORD` in `.env` before seeding, or
> edit the admin user in the database. The seeded WhatsApp number `08012345678` is a
> **placeholder** — replace it in **Admin → Settings** so customer WhatsApp links work.

## First-run checklist for the store owner

1. Log in to the admin dashboard.
2. **Settings tab** → set your real WhatsApp number, support email, address, opening hours.
3. **Settings → Payment details** → optionally add bank name / account name / account
   number. These are shown to customers only after an order exists. **Leave empty** if you
   prefer to share payment details personally on WhatsApp (the safe default).
4. Set fees (delivery Malete / outside, customization fee) and the promo code.
5. **Products & Stock tab** → adjust real stock levels per size.
6. Place a test order yourself and walk it through: Confirm availability → (customer pays
   offline) → Mark PAID with a verification note → Process → Ready → Completed.

## Environment variables

Copy `.env.example` → `.env` and fill in what you have. Everything degrades gracefully:
missing email/WhatsApp credentials mean notifications are logged as FAILED (visible in
**Admin → Notifications** with a Retry button) — **orders are never lost**.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | SQLite file (dev) or PostgreSQL URL (prod) |
| `AUTH_SECRET` | ✅ (prod) | Signs admin session JWTs — use a long random string |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | Initial admin credentials |
| `BREVO_API_KEY` | optional | Enables transactional emails (Brevo) |
| `BREVO_SENDER_EMAIL` | optional | Verified sender, e.g. `orders@yourdomain.com` |
| `BREVO_SENDER_NAME` | optional | Display name (default `MALÈTE KITS`) |
| `WHATSAPP_ACCESS_TOKEN` | optional | Meta WhatsApp Cloud API token (Mode B) |
| `WHATSAPP_PHONE_NUMBER_ID` | optional | Meta phone number ID (Mode B) |
| `OWNER_WHATSAPP_NUMBER` | optional | Seeded into store settings on first run |

**Brevo setup:** create a free account → SMTP & API → generate an API key → verify your
sender email → put both in `.env`. Test with the Retry button in Admin → Notifications.

**WhatsApp Cloud API (Mode B):** create a Meta app → add the WhatsApp product → get the
phone number ID + permanent token → set both env vars. The owner's WhatsApp number must
also be set in **Admin → Settings**. Until this is configured, Mode A (click-to-chat)
covers everything — links are generated on the confirmation page and in the admin panel;
a human presses send.

## Email & WhatsApp behaviour (reliability contract)

- The order is **saved first**; notifications run after the response via Next.js `after()`.
- A failed email/WhatsApp **never fails the order** — it's recorded in `NotificationLog`
  with the provider error and attempt count.
- Emails always state the order is **awaiting availability confirmation and payment** and
  never claim payment was received.
- Automated WhatsApp (Mode B) is honest: without credentials it is logged as FAILED with
  "not configured" and can be retried once configured.

## Database

Dev uses SQLite (`db/custom.db`). A baseline migration exists at
`prisma/migrations/0_init`.

**Switching to PostgreSQL / Supabase in production:**

```bash
# 1. In .env
DATABASE_URL="postgresql://user:password@host:5432/malete?schema=public"

# 2. In prisma/schema.prisma change:  provider = "postgresql"

# 3. Fresh database → apply migrations + seed
bunx prisma migrate deploy
bun run db:seed
```

The schema is enum-free (string statuses validated with zod) so it ports cleanly. Models:
`AdminUser, Category, Product, ProductVariant, InventoryLog, Customer, Order, OrderItem,
OrderStatusHistory, PaymentRecord, NotificationLog, StoreSettings, Counter`.

## Deployment

The app is a standard Next.js (App Router) project — deploy to Vercel / Railway / Render /
a VPS:

1. Provision PostgreSQL (Supabase is a good fit) and set `DATABASE_URL`.
2. Set `AUTH_SECRET` (`openssl rand -hex 32`), Brevo + WhatsApp vars, `NODE_ENV=production`.
3. `bunx prisma migrate deploy && bun run db:seed` against the production database.
4. `bun run build && bun run start` (or `next build` on Vercel — no extra config needed).
5. After first login, change the admin password and replace the placeholder WhatsApp
   number in Admin → Settings.

Sessions are httpOnly cookies (`sameSite=lax`, `secure` in production, 12h TTL). Login,
order creation and tracking endpoints are rate-limited per IP (limits are deliberately
generous because many students share campus NAT IPs).

## Security notes

- All prices, stock and totals are re-validated server-side on every order — client
  totals are display-only.
- Stock is checked and decremented inside a Prisma transaction (no oversell).
- Idempotency keys make double-submits return the original order.
- Tracking requires order number **plus** matching email/phone (or the secret tracking
  token); responses never leak other customers' data or internal ids.
- No card data is collected anywhere; there is no payment page at all.
- Payment status changes require an explicit verification note and are recorded with the
  acting admin and timestamp (`PaymentRecord` + `OrderStatusHistory`).
- Admin APIs all re-verify the session and the admin's active status on every request.

## Testing checklist

See **TESTING-CHECKLIST.md** for the full manual QA script (storefront, checkout, admin,
notifications, security abuse cases).
