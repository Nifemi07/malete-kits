import { getSessionAdmin } from '@/lib/auth'
import { ok } from '@/lib/api-helpers'
import { isEmailConfigured } from '@/lib/email'
import { isAutomatedWhatsAppConfigured } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

/** GET /api/admin/me — session probe + integration configuration status. */
export async function GET() {
  const admin = await getSessionAdmin()
  if (!admin) return ok({ admin: null, integrations: null })
  return ok({
    admin,
    integrations: {
      email: {
        provider: 'BREVO',
        configured: isEmailConfigured(),
        hint: 'Set BREVO_API_KEY and BREVO_SENDER_EMAIL in .env to enable automatic emails.',
      },
      whatsapp: {
        provider: 'META_CLOUD_API',
        configured: isAutomatedWhatsAppConfigured(),
        hint: 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env to enable automated WhatsApp. Click-to-chat always works.',
      },
    },
  })
}
