// Renders the real confirmation email with the store's bank details so the
// owner can preview exactly what customers receive. Output: .zscripts/payment-email-preview.html
import { buildOrderConfirmationEmail, type OrderEmailData } from '../src/lib/email'
import { getSettings } from '../src/lib/settings'

const settings = await getSettings()
const bank = {
  bankName: settings.bankName,
  accountName: settings.accountName,
  accountNumber: settings.accountNumber,
  paymentInstructions: settings.paymentInstructions,
}

// Mirrors paymentBlockHtml() in src/lib/notifications.ts (not exported there)
function paymentBlockHtml(b?: typeof bank): string {
  if (!b || !b.bankName || !b.accountName || !b.accountNumber) return ''
  return `
      <div style="margin-top:16px;padding:16px 20px;background:#FFFFFF;border:1px solid #E7E5DC;border-radius:10px;font-size:14px;color:#17191C;line-height:1.8;">
        <div style="font-weight:800;margin-bottom:6px;">Payment details (transfer)</div>
        <div>Bank: <strong>${b.bankName}</strong></div>
        <div>Account name: <strong>${b.accountName}</strong></div>
        <div>Account number: <strong style="font-size:16px;letter-spacing:1px;">${b.accountNumber}</strong></div>
        ${b.paymentInstructions ? `<div style="margin-top:8px;color:#6B6F76;">${b.paymentInstructions}</div>` : ''}
        <div style="margin-top:10px;color:#8A4B00;background:#FFF4E0;padding:8px 12px;border-radius:6px;font-size:13px;">
          Send your payment ONLY after we confirm availability. Always confirm you are paying the account above.
        </div>
      </div>`
}

const order = {
  orderNumber: 'MK-1033',
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  customerPhone: '2348089404255',
  createdAt: new Date(),
  items: [
    { productName: 'Arsenal Home Shirt 25/26', jerseyType: 'FAN', size: 'L', quantity: 1, unitPrice: 11500, lineTotal: 11500, custPlayerName: null, custPlayerNumber: null },
  ],
  subtotal: 11500,
  customizationFee: 0,
  deliveryFee: 1000,
  discount: 0,
  promoCode: null,
  instructions: null,
  total: 12500,
  fulfillmentMethod: 'DELIVERY',
  deliveryZone: 'MALETE',
  address: 'Peace Lodge, Off Campus Road',
  paymentStatus: 'UNPAID',
  status: 'AWAITING_OWNER_CONFIRMATION',
} as unknown as OrderEmailData

const html = buildOrderConfirmationEmail(order, paymentBlockHtml(bank))
await Bun.write('/home/z/my-project/.zscripts/payment-email-preview.html', html)
console.log('✓ payment email preview written')
