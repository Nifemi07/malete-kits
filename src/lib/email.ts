// ---------------------------------------------------------------------------
// Transactional email (Brevo HTTP API) — branded order-confirmation template.
//
// The email ALWAYS states that the order is received but AWAITING availability
// confirmation and payment. It NEVER claims payment has been received.
// If Brevo credentials are absent the send fails gracefully and the failure is
// recorded in NotificationLog so the owner can retry from the dashboard.
// ---------------------------------------------------------------------------
import { displayPhone } from './validation'

export interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  fulfillmentMethod: string
  deliveryZone: string | null
  address: string | null
  instructions: string | null
  subtotal: number
  customizationFee: number
  deliveryFee: number
  discount: number
  promoCode: string | null
  total: number
  paymentStatus: string
  status: string
  createdAt: Date
  items: Array<{
    productName: string
    jerseyType: string
    size: string
    quantity: number
    unitPrice: number
    custPlayerName: string | null
    custPlayerNumber: number | null
    customizationFee: number
    lineTotal: number
  }>
}

const LIME = '#B9F73E'
const INK = '#17191C'
const CHARCOAL = '#23262B'
const GREEN = '#0E4632'
const OFFWHITE = '#F5F3EC'

export function buildOrderConfirmationEmail(order: OrderEmailData, paymentBlockHtml: string): string {
  const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid #E7E5DC;">
          <div style="font-weight:700;color:${INK};font-size:14px;">${escapeHtml(i.productName)}</div>
          <div style="color:#6B6F76;font-size:12px;margin-top:3px;">
            ${i.jerseyType === 'PLAYER' ? 'Player Version' : 'Fan Version'} &middot; Size ${escapeHtml(i.size)} &middot; Qty ${i.quantity}
            ${i.custPlayerName || i.custPlayerNumber !== null
              ? `<br/><span style="color:${GREEN};font-weight:600;">Custom: &quot;${escapeHtml(i.custPlayerName ?? '—')}&quot; #${i.custPlayerNumber ?? '—'}</span>`
              : ''}
          </div>
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #E7E5DC;text-align:right;font-size:13px;color:${INK};">
          ${naira(i.lineTotal)}
        </td>
      </tr>`
    )
    .join('')

  const fulfilment =
    order.fulfillmentMethod === 'PICKUP'
      ? '<strong>Pickup</strong> — collect in Malete (address shared on confirmation)'
      : `<strong>Delivery</strong> — ${escapeHtml(order.address ?? '')} (${order.deliveryZone === 'OTHER' ? 'outside Malete' : 'Malete'})`

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#EDEBE2;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:620px;margin:0 auto;background:${OFFWHITE};">
    <div style="background:${INK};padding:28px 32px;">
      <div style="font-size:24px;font-weight:900;letter-spacing:2px;color:${OFFWHITE};">MALÈTE <span style="color:${LIME};">KITS</span></div>
      <div style="color:#9BA1A8;font-size:12px;margin-top:4px;letter-spacing:1px;">AUTHENTIC FOOTBALL JERSEYS · MALETE, KWARA STATE</div>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:${INK};">Order received, ${escapeHtml(order.customerName.split(' ')[0])}! ⚽</h1>
      <p style="margin:0 0 20px;color:#4A4F55;font-size:14px;line-height:1.6;">
        Thanks for shopping with MALÈTE KITS. Your order <strong style="color:${GREEN};">${order.orderNumber}</strong> has been received
        and is now <strong>awaiting availability confirmation</strong> from our team. We will contact you on
        <strong>${escapeHtml(displayPhone(order.customerPhone))}</strong> / WhatsApp shortly to confirm your jerseys and share payment details.
        <br/><br/>
        <em style="color:#8A4B00;background:#FFF4E0;padding:6px 10px;border-left:3px solid #F5A524;display:block;font-size:13px;">
          Please do NOT send payment yet — wait for our availability confirmation and payment instructions.
        </em>
      </p>

      <div style="background:${CHARCOAL};color:${OFFWHITE};padding:16px 20px;border-radius:10px;margin-bottom:24px;">
        <div style="display:inline-block;background:${LIME};color:${INK};font-weight:800;font-size:13px;padding:4px 12px;border-radius:999px;letter-spacing:1px;">
          ORDER ${order.orderNumber}
        </div>
        <div style="margin-top:10px;font-size:13px;color:#C9CDD2;">Placed ${order.createdAt.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>

      <h2 style="font-size:15px;color:${INK};letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Your jerseys</h2>
      <table style="width:100%;border-collapse:collapse;background:#FFFFFF;border-radius:8px;overflow:hidden;">
        ${rows}
      </table>

      <table style="width:100%;margin-top:16px;font-size:14px;color:${INK};">
        <tr><td style="padding:4px 0;color:#6B6F76;">Subtotal</td><td style="text-align:right;">${naira(order.subtotal)}</td></tr>
        <tr><td style="padding:4px 0;color:#6B6F76;">Customization</td><td style="text-align:right;">${naira(order.customizationFee)}</td></tr>
        <tr><td style="padding:4px 0;color:#6B6F76;">Delivery / Pickup</td><td style="text-align:right;">${naira(order.deliveryFee)}</td></tr>
        ${order.discount > 0 ? `<tr><td style="padding:4px 0;color:${GREEN};">Discount${order.promoCode ? ` (${escapeHtml(order.promoCode)})` : ''}</td><td style="text-align:right;color:${GREEN};">-${naira(order.discount)}</td></tr>` : ''}
        <tr>
          <td style="padding:12px 0 0;font-weight:800;font-size:16px;">Total payable</td>
          <td style="text-align:right;padding:12px 0 0;font-weight:900;font-size:18px;color:${GREEN};">${naira(order.total)}</td>
        </tr>
      </table>

      <div style="margin-top:24px;padding:16px 20px;background:#FFFFFF;border-radius:10px;font-size:14px;color:${INK};line-height:1.7;">
        <div style="font-weight:800;margin-bottom:6px;">${order.fulfillmentMethod === 'PICKUP' ? 'Pickup preference' : 'Delivery preference'}</div>
        ${fulfilment}
        ${order.instructions ? `<div style="margin-top:8px;color:#6B6F76;">Your note: “${escapeHtml(order.instructions)}”</div>` : ''}
      </div>

      <div style="margin-top:16px;padding:16px 20px;background:${GREEN};border-radius:10px;color:${OFFWHITE};font-size:14px;line-height:1.7;">
        <div style="font-weight:800;margin-bottom:6px;">What happens next?</div>
        <div>1. We confirm every jersey, size and customization is in stock.</div>
        <div>2. We contact you with payment instructions (transfer or cash).</div>
        <div>3. After we verify your payment, your order moves to processing.</div>
        <div>4. Pickup or delivery — you will be notified at every step.</div>
      </div>

      ${paymentBlockHtml}

      <p style="margin-top:24px;color:#6B6F76;font-size:12px;line-height:1.6;">
        Questions? Message us on WhatsApp or reply to this email. Track your order any time on our website using
        order number <strong>${order.orderNumber}</strong> and the email or phone number you provided.
      </p>
    </div>
    <div style="background:${INK};color:#9BA1A8;text-align:center;font-size:11px;letter-spacing:1px;padding:18px;">
      MALÈTE KITS · MALETE, KWARA STATE, NIGERIA<br/>
      This is an automated confirmation — no payment has been collected.
    </div>
  </div>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// --- Brevo sender ------------------------------------------------------------

export function isEmailConfigured(): boolean {
  const brevo = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL)
  const smtp2go = Boolean(process.env.SMTP2GO_API_KEY && emailSenderAddress())
  return brevo || smtp2go
}

/** First verified sender address across providers (used by SMTP2GO). */
function emailSenderAddress(): string | undefined {
  return (
    process.env.SMTP2GO_SENDER_EMAIL ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.OWNER_SUPPORT_EMAIL ||
    undefined
  )
}

/** Human-readable active provider for dashboard labels. */
export function activeEmailProvider(): 'BREVO' | 'SMTP2GO' | 'NONE' {
  if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) return 'BREVO'
  if (process.env.SMTP2GO_API_KEY) return 'SMTP2GO'
  return 'NONE'
}

export interface EmailSendResult {
  ok: boolean
  error?: string
  provider: string
}

export async function sendEmailViaBrevo(to: string, toName: string, subject: string, html: string): Promise<EmailSendResult> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'MALÈTE KITS'
  if (!apiKey || !senderEmail) {
    return {
      ok: false,
      provider: 'BREVO',
      error: 'Email provider not configured — set BREVO_API_KEY and BREVO_SENDER_EMAIL. The order is safe; retry from the admin dashboard once configured.',
    }
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: toName }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, provider: 'BREVO', error: `Brevo error ${res.status}: ${body.slice(0, 300)}` }
    }
    return { ok: true, provider: 'BREVO' }
  } catch (err) {
    return { ok: false, provider: 'BREVO', error: `Email send failed: ${(err as Error).message}` }
  }
}

/** SMTP2GO free tier (1,000 emails/month) — no card, no domain required. */
export async function sendEmailViaSmtp2go(to: string, toName: string, subject: string, html: string): Promise<EmailSendResult> {
  const apiKey = process.env.SMTP2GO_API_KEY
  const senderEmail = emailSenderAddress()
  const senderName = process.env.BREVO_SENDER_NAME || 'MALÈTE KITS'
  if (!apiKey || !senderEmail) {
    return {
      ok: false,
      provider: 'SMTP2GO',
      error: 'SMTP2GO not fully configured — set SMTP2GO_API_KEY and SMTP2GO_SENDER_EMAIL (the email you verified in SMTP2GO).',
    }
  }
  try {
    const res = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: [to],
        sender: `${senderName} <${senderEmail}>`,
        subject,
        html_body: html,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const body = await res.text().catch(() => '')
    if (!res.ok) {
      return { ok: false, provider: 'SMTP2GO', error: `SMTP2GO error ${res.status}: ${body.slice(0, 300)}` }
    }
    // SMTP2GO returns HTTP 200 with an error object inside `data` on rejection
    // (e.g. sender not verified) — surface it instead of falsely reporting SENT.
    try {
      const json = JSON.parse(body) as { data?: { error?: string; error_code?: string | number } }
      if (json?.data?.error) {
        return { ok: false, provider: 'SMTP2GO', error: `SMTP2GO ${json.data.error_code ?? ''}: ${json.data.error}`.slice(0, 300) }
      }
    } catch {
      // non-JSON success body — treat as delivered
    }
    return { ok: true, provider: 'SMTP2GO' }
  } catch (err) {
    return { ok: false, provider: 'SMTP2GO', error: `Email send failed: ${(err as Error).message}` }
  }
}

/**
 * Provider-agnostic dispatcher. Brevo wins if configured; otherwise SMTP2GO.
 * The order is NEVER lost either way — failures are logged for dashboard retry.
 */
export async function sendEmail(to: string, toName: string, subject: string, html: string): Promise<EmailSendResult> {
  if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
    return sendEmailViaBrevo(to, toName, subject, html)
  }
  if (process.env.SMTP2GO_API_KEY) {
    return sendEmailViaSmtp2go(to, toName, subject, html)
  }
  return {
    ok: false,
    provider: 'NONE',
    error: 'Email provider not configured — set BREVO_API_KEY or SMTP2GO_API_KEY (plus a verified sender email). The order is safe; retry from the admin dashboard once configured.',
  }
}
