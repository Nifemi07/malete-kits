// Shared helpers for API route handlers.
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AuthError } from './auth'
import { PricingError } from './pricing'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init)
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export function handleError(err: unknown) {
  if (err instanceof AuthError) return fail(err.message, err.status)
  if (err instanceof PricingError) return fail(err.message, err.status, { details: err.details })
  if (err instanceof ZodError) {
    const first = err.issues[0]
    return fail(first?.message ?? 'Invalid request', 422, {
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  console.error('[API ERROR]', err)
  return fail('Something went wrong on our side. Please try again.', 500)
}
