import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — deployment diagnostic (safe: no values, only booleans
 * and Prisma error codes; never leaks credentials).
 */
export async function GET() {
  const raw = process.env.DATABASE_URL ?? ''
  const env = {
    hasDatabaseUrl: raw.length > 0,
    looksLikePostgres: raw.startsWith('postgres://') || raw.startsWith('postgresql://'),
    looksLikeSqlite: raw.startsWith('file:'),
    hasAuthSecret: !!process.env.AUTH_SECRET,
  }

  let dbState: 'ok' | 'fail' = 'ok'
  let code: string | null = null
  try {
    await db.$queryRaw`SELECT 1`
  } catch (e: unknown) {
    dbState = 'fail'
    const err = e as { code?: string }
    const msg = e instanceof Error ? e.message : String(e)
    code = err?.code ?? msg.match(/P1\d{3}/)?.[0] ?? 'UNKNOWN'
  }

  return NextResponse.json(
    { ok: dbState === 'ok', env, db: dbState, code },
    { headers: { 'cache-control': 'no-store' } },
  )
}
