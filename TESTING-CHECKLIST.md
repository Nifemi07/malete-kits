# MALÈTE KITS — Testing Checklist

Manual QA script for the store. Suggested once before launch and after any big change.
Automated API equivalents live in `scripts/api-smoke-test.sh` (requires the dev server).

## 1. Storefront browsing

- [ ] Homepage loads: hero, category tiles, Featured Kits, How Ordering Works, New In, promo banner.
- [ ] Header announcement bar shows the configured announcement.
- [ ] Search for `Nigeria`, `Real Madrid`, `Serie A` → relevant results only.
- [ ] Filters work: Category (Club/National), Team, Kit type, Sort (price asc/desc, newest).
- [ ] Product cards show badge, team, price in ₦; sold-out products show a "Sold Out" veil.
- [ ] Product page: Fan vs Player version updates the price (+₦4,500 by default).
- [ ] Sold-out size is struck through and unclickable; low-stock sizes show "Only N left".
- [ ] Enable customization → name/number inputs appear; invalid name (digits/symbols >12 chars) or number (>99) is rejected.
- [ ] Add to cart updates the header badge and shows a toast with the correct total.

## 2. Cart & checkout

- [ ] Cart shows line items with size, jersey type, customization; quantity steppers respect stock (max 10).
- [ ] Remove item works; totals update instantly (jerseys + customization).
- [ ] Checkout: submitting with an empty/invalid email, bad phone (`12345`), or missing delivery address is blocked with clear field errors.
- [ ] Nigerian phone formats accepted: `08012345678`, `+2348012345678`, `2348012345678`.
- [ ] Pickup selected → no address needed, pickup fee applied (₦0 by default).
- [ ] Delivery selected → zone select appears; Malete ₦1,000 / Outside ₦2,500 (settings-driven).
- [ ] Promo `KWASU10` → discount appears instantly (10% of jerseys, capped ₦2,000). Unknown codes are ignored (standard price).
- [ ] Final total = subtotal + customization + delivery − discount. This matches the confirmation page exactly.

## 3. Order creation & confirmation

- [ ] Placing the order lands on **Order Received** with an `MK-1xxx` number and a copy button.
- [ ] "Payment status right now: UNPAID" is visible; the page never says payment succeeded.
- [ ] "Send order on WhatsApp" opens wa.me with the full order details pre-filled (Mode A).
- [ ] Refreshing the confirmation page still shows the order (via secure tracking token).
- [ ] Double-clicking Place order / refreshing during submit does NOT create duplicate orders (idempotency key).
- [ ] Stock for the purchased size decreased (verify in Admin → Products & Stock).

## 4. Order tracking

- [ ] Track with order number + the phone used → order appears with progress timeline.
- [ ] Track with order number + the email used → works too.
- [ ] Track with order number + a WRONG phone/email → uniform "could not find" error (no info leak).
- [ ] The confirmation-page token link opens the order directly.
- [ ] Status timeline reflects the real status set by the owner (see §5).

## 5. Admin — orders

- [ ] `/#/admin` requires login; visiting while logged out shows only the login form.
- [ ] Login with wrong password → "Invalid email or password"; 6 failed attempts → rate-limited.
- [ ] Stats row matches reality (Total, New/Awaiting confirmation, Awaiting payment, Paid, …).
- [ ] Search by order number / customer name / phone / email works; status & payment filters work.
- [ ] Open MK-order → Overview shows customer, delivery address, items, customization, financial breakdown.
- [ ] "Confirm availability" → status becomes CONFIRMED; stats update; timeline records who/when.
- [ ] Payment tab: Mark PAID **without** a verification note is rejected (client + server).
- [ ] Mark PAID with method + note → Paid badge; Verified revenue increases by the order total.
- [ ] Payment audit trail shows: timestamp, UNPAID → PAID, method, amount, admin email, note.
- [ ] Status flow respects rules: cannot COMPLETED before PAID; cancelled orders cannot be reopened.
- [ ] Cancel an awaiting order → stock is restored (check Products & Stock).
- [ ] Internal notes save and persist.
- [ ] "WhatsApp customer" opens a chat with the customer's number.
- [ ] "Resend confirmation email" records a new notification attempt (SENT or FAILED-honestly).

## 6. Admin — notifications

- [ ] Without Brevo/WhatsApp credentials: EMAIL + WHATSAPP logs show FAILED with "not configured" reasons.
- [ ] Orders still exist and are fully manageable (never lost because of notification failure).
- [ ] Retry increments the attempt counter and re-records the outcome.
- [ ] After adding real `BREVO_API_KEY` (+ verified sender) and retrying: status becomes SENT and the customer receives a branded email stating the order awaits confirmation & payment.
- [ ] After adding real Meta Cloud API credentials and retrying: owner receives the order message.

## 7. Admin — settings & inventory

- [ ] Change WhatsApp number → customer-facing WhatsApp buttons update after refresh.
- [ ] Change delivery fees / customization fee → new orders use the new values.
- [ ] Update promo code/percent → checkout applies it.
- [ ] Stock editor: change a size's stock → Save → catalog reflects availability; InventoryLog records MANUAL_ADJUST.
- [ ] Bank details left empty → customers are told payment details will be shared personally (no invented bank info anywhere).

## 8. Responsiveness & UX

- [ ] Mobile (390px): header collapses to sheet menu; catalog/filters stack; product page, cart, checkout, admin all usable.
- [ ] Desktop (1440px): 4-column product grid, sticky summaries, no layout overflow.
- [ ] Footer sticks to the bottom on short pages and is pushed down on long pages.

## 9. Security spot-checks

- [ ] `GET /api/admin/stats` without a session → 401.
- [ ] `POST /api/orders` with a tampered price/total in the body → ignored; server re-prices.
- [ ] `POST /api/orders` with quantity above stock → 400 with a per-item message.
- [ ] `POST /api/orders` with a bad phone → 422 validation error.
- [ ] Tracking endpoint never returns `idempotencyKey`, `trackingToken`, or other customers' data.
- [ ] No card fields anywhere in the checkout; nothing mentions online payment success.
