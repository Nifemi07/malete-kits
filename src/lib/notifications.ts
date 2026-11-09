// ---------------------------------------------------------------------------
// Notification orchestrator.
//
// RELIABILITY CONTRACT
//  1. Orders are ALWAYS saved first; notifications run strictly after commit.
//  2. A failed email/WhatsApp NEVER fails the order — the failure is recorded
//     in NotificationLog with the error, and the owner can retry from the
//     admin dashboard.
//  3. Every attempt is tracked: PENDING → SENT | FAILED, with attempt counts.
//  4. MODE A (WhatsApp click-to-chat) needs no credentials and is surfaced on
//     the confirmation page + admin dashboard. MODE B (automated) only sends
//     when explicitly configured and every attempt is honestly logged.
// ---------------------------------------------------------------------------
import { db } from './db'
import { getSettings } from './settings'
import {
  buildOrderConfirmationEmail,
  buildLoginCodeEmail,
  sendEmail,
  isEmailConfigured,
} from './email'
import {
  buildAutomatedWhatsAppText,
  isAutomatedWhatsAppConfigured,
  sendAutomatedWhatsApp,
} from './whatsapp'

async function loadOrder(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, include: { items: true } })
}

function paymentBlockHtml(bank?: { bankName: string | null; accountName: string | null; accountNumber: string | null; paymentInstructions: string | null } | null): string {
  if (bank && bank.bankName && bank.accountName && bank.accountNumber) {
    return `
      <div style="margin-top:16px;padding:16px 20px;background:#FFFFFF;border:1px solid #E7E5DC;border-radius:10px;font-size:14px;color:#17191C;line-height:1.8;">
        <div style="font-weight:800;margin-bottom:6px;">Payment details (transfer)</div>
        <div>Bank: <strong>${bank.bankName}</strong></div>
        <div>Account name: <strong>${bank.accountName}</strong></div>
        <div>Account number: <strong style="font-size:16px;letter-spacing:1px;">${bank.accountNumber}</strong></div>
        ${bank.paymentInstructions ? `<div style="margin-top:8px;color:#6B6F76;">${bank.paymentInstructions}</div>` : ''}
        <div style="margin-top:10px;color:#8A4B00;background:#FFF4E0;padding:8px 12px;border-radius:6px;font-size:13px;">
          Send your payment ONLY after we confirm availability. Always confirm you are paying the account above.
        </div>
      </div>`
  }
  return `
      <div style="margin-top:16px;padding:16px 20px;background:#FFFFFF;border:1px solid #E7E5DC;border-radius:10px;font-size:14px;color:#17191C;line-height:1.8;">
        <div style="font-weight:800;margin-bottom:6px;">Payment</div>
        <div style="color:#6B6F76;">Payment details are shared personally by the store owner after your order is confirmed — no online payment is collected on this website.</div>
      </div>`
}

/**
 * Creates + attempts both notifications for a freshly saved order.
 * Fire-and-forget safe: never throws to the caller.
 */
export async function dispatchOrderNotifications(orderId: string): Promise<void> {
  try {
    const order = await loadOrder(orderId)
    if (!order) return
    const settings = await getSettings()

    // ---- EMAIL -------------------------------------------------------------
    const emailLog = await db.notificationLog.create({
      data: {
        orderId: order.id,
        channel: 'EMAIL',
        recipient: order.customerEmail,
        status: 'PENDING',
        provider: isEmailConfigured() ? (process.env.BREVO_API_KEY ? 'BREVO' : 'SMTP2GO') : null,
        payload: JSON.stringify({ subject: `Order ${order.orderNumber} received — MALÈTE KITS` }),
      },
    })
    const emailResult = await sendEmail(
      order.customerEmail,
      order.customerName,
      `Order ${order.orderNumber} received — awaiting confirmation | MALÈTE KITS`,
      buildOrderConfirmationEmail(
        { ...order, createdAt: order.createdAt },
        paymentBlockHtml(settings)
      )
    )
    await db.notificationLog.update({
      where: { id: emailLog.id },
      data: {
        status: emailResult.ok ? 'SENT' : 'FAILED',
        attempts: { increment: 1 },
        provider: emailResult.provider,
        error: emailResult.ok ? null : emailResult.error,
        sentAt: emailResult.ok ? new Date() : null,
      },
    }).catch(() => {})

    // ---- WHATSAPP (automated, optional) -------------------------------------
    const ownerNumber = settings.whatsappNumber
    const waLog = await db.notificationLog.create({
      data: {
        orderId: order.id,
        channel: 'WHATSAPP',
        recipient: ownerNumber || '(owner number not configured)',
        status: 'PENDING',
        provider: 'META_CLOUD_API',
        payload: JSON.stringify({ automated: true, configured: isAutomatedWhatsAppConfigured() }),
      },
    })
    if (!ownerNumber) {
      await db.notificationLog.update({
        where: { id: waLog.id },
        data: { status: 'FAILED', attempts: { increment: 1 }, error: 'Owner WhatsApp number not configured in store settings.' },
      }).catch(() => {})
    } else {
      const text = buildAutomatedWhatsAppText(order)
      const waResult = await sendAutomatedWhatsApp(text, ownerNumber)
      await db.notificationLog.update({
        where: { id: waLog.id },
        data: {
          status: waResult.ok ? 'SENT' : 'FAILED',
          attempts: { increment: 1 },
          error: waResult.ok ? null : waResult.error,
          sentAt: waResult.ok ? new Date() : null,
        },
      }).catch(() => {})
    }
  } catch {
    // Swallow — dispatch must never break the order flow. Logs stay PENDING/FAILED
    // and the owner can retry from the dashboard.
  }
}

/**
 * Sends a customer sign-in code email and records the attempt in NotificationLog
 * (orderId is null — this is a store-wide notification, not an order one).
 * Returns whether the email actually left the building, so the login UI can be
 * honest when no provider is configured.
 */
export async function dispatchLoginCodeEmail(
  email: string,
  name: string | null,
  code: string,
): Promise<{ delivered: boolean }> {
  let logId: string | null = null
  try {
    const log = await db.notificationLog.create({
      data: {
        orderId: null,
        channel: 'EMAIL',
        recipient: email,
        status: 'PENDING',
        provider: isEmailConfigured() ? (process.env.BREVO_API_KEY ? 'BREVO' : 'SMTP2GO') : null,
        payload: JSON.stringify({ purpose: 'CUSTOMER_LOGIN_CODE', subject: 'Your MALÈTE KITS sign-in code' }),
      },
    })
    logId = log.id
  } catch {
    // Logging must never block the code send.
  }

  const result = await sendEmail(email, name ?? 'Customer', 'Your MALÈTE KITS sign-in code', buildLoginCodeEmail(name, code))

  if (logId) {
    await db.notificationLog
      .update({
        where: { id: logId },
        data: {
          status: result.ok ? 'SENT' : 'FAILED',
          attempts: { increment: 1 },
          error: result.ok ? null : result.error,
          sentAt: result.ok ? new Date() : null,
        },
      })
      .catch(() => {})
  }
  return { delivered: result.ok }
}

/** Re-attempt a single notification log (admin dashboard retry button). */
export async function retryNotification(logId: string): Promise<{ ok: boolean; error?: string }> {
  const log = await db.notificationLog.findUnique({ where: { id: logId }, include: { order: { include: { items: true } } } })
  if (!log) return { ok: false, error: 'Notification log not found' }
  const settings = await getSettings()

  if (log.channel === 'EMAIL') {
    // Store-wide emails (e.g. customer sign-in codes) have no order — a retry
    // would resend an expired code, so refuse honestly instead.
    if (!log.order) {
      await db.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', attempts: { increment: 1 }, error: 'Login-code email cannot be retried — codes expire in 10 minutes. Ask the customer to request a fresh code.' },
      })
      return { ok: false, error: 'Login-code emails cannot be retried — ask the customer to request a fresh code.' }
    }
    const result = await sendEmail(
      log.order.customerEmail,
      log.order.customerName,
      `Order ${log.order.orderNumber} received — awaiting confirmation | MALÈTE KITS`,
      buildOrderConfirmationEmail(
        { ...log.order, createdAt: log.order.createdAt },
        paymentBlockHtml(settings)
      )
    )
    await db.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.ok ? 'SENT' : 'FAILED',
        attempts: { increment: 1 },
        error: result.ok ? null : result.error,
        sentAt: result.ok ? new Date() : null,
      },
    })
    return { ok: result.ok, error: result.error }
  }

  // WHATSAPP
  if (!log.order) {
    await db.notificationLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', attempts: { increment: 1 }, error: 'WhatsApp notifications are always tied to an order — nothing to retry.' },
    })
    return { ok: false, error: 'WhatsApp notifications are always tied to an order — nothing to retry.' }
  }
  if (!settings.whatsappNumber) {
    await db.notificationLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', attempts: { increment: 1 }, error: 'Owner WhatsApp number not configured in store settings.' },
    })
    return { ok: false, error: 'Owner WhatsApp number not configured in store settings.' }
  }
  const result = await sendAutomatedWhatsApp(buildAutomatedWhatsAppText(log.order), settings.whatsappNumber)
  await db.notificationLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? 'SENT' : 'FAILED',
      attempts: { increment: 1 },
      error: result.ok ? null : result.error,
      sentAt: result.ok ? new Date() : null,
    },
  })
  return { ok: result.ok, error: result.error }
}

/** Resend the confirmation email for an order (creates a fresh log entry). */
export async function resendConfirmationEmail(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const log = await db.notificationLog.create({
    data: {
      orderId,
      channel: 'EMAIL',
      recipient: '',
      status: 'PENDING',
      provider: isEmailConfigured() ? (process.env.BREVO_API_KEY ? 'BREVO' : 'SMTP2GO') : null,
      payload: JSON.stringify({ subject: 'manual resend' }),
    },
  })
  const order = await loadOrder(orderId)
  if (!order) {
    await db.notificationLog.update({ where: { id: log.id }, data: { status: 'FAILED', attempts: 1, error: 'Order not found' } })
    return { ok: false, error: 'Order not found' }
  }
  await db.notificationLog.update({ where: { id: log.id }, data: { recipient: order.customerEmail } })
  const settings = await getSettings()
  const result = await sendEmail(
    order.customerEmail,
    order.customerName,
    `Your MALÈTE KITS order ${order.orderNumber}`,
    buildOrderConfirmationEmail({ ...order, createdAt: order.createdAt }, paymentBlockHtml(settings))
  )
  await db.notificationLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? 'SENT' : 'FAILED',
      attempts: { increment: 1 },
      error: result.ok ? null : result.error,
      sentAt: result.ok ? new Date() : null,
    },
  })
  return { ok: result.ok, error: result.error }
}
