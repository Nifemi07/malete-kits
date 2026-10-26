#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# MALÈTE KITS — provision a FRESH production database (PostgreSQL) from here.
#
# Usage:
#   PROD_DATABASE_URL="postgres://…-pooler…" bash scripts/deploy-db.sh
#
# Optional seed overrides (production store identity — never committed):
#   SEED_WHATSAPP_NUMBER  SEED_SUPPORT_EMAIL  SEED_PAYMENT_METHODS
#   SEED_BANK_NAME  SEED_ACCOUNT_NAME  SEED_ACCOUNT_NUMBER
#
# Safe to re-run while the store is BRAND NEW (schema push is declarative,
# seed is idempotent with update:{}). Do NOT re-run after editing prices in
# the admin dashboard — the seed would reset basePrice values.
# ---------------------------------------------------------------------------
set -euo pipefail

: "${PROD_DATABASE_URL:?Set PROD_DATABASE_URL to the production Postgres connection string (the pooled URL from Vercel)}"
SCHEMA=prisma/schema.prod.prisma

restore_local_client() {
  echo "→ Restoring local (SQLite) Prisma client…"
  bunx prisma generate >/dev/null 2>&1
}
trap restore_local_client EXIT

echo "→ Validating $SCHEMA…"
DATABASE_URL="$PROD_DATABASE_URL" bunx prisma validate --schema "$SCHEMA"

echo "→ Generating PostgreSQL Prisma client…"
bunx prisma generate --schema "$SCHEMA" >/dev/null

echo "→ Pushing schema to the production database…"
DATABASE_URL="$PROD_DATABASE_URL" bunx prisma db push --schema "$SCHEMA" --skip-generate --accept-data-loss

echo "→ Seeding the production database…"
DATABASE_URL="$PROD_DATABASE_URL" bun prisma/seed.ts

echo "✓ Production database is ready."
