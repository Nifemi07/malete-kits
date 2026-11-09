#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# MALÈTE KITS — rotate the dashboard admin password, local or production.
#
# Local (SQLite, uses DATABASE_URL from .env):
#   bash scripts/rotate-admin-password.sh
#
# Production (PostgreSQL):
#   ADMIN_PASSWORD='new-pass' PROD_DATABASE_URL='postgres://…' \
#     bash scripts/rotate-admin-password.sh
#
# The password is taken from ADMIN_PASSWORD (or .env via bun). If neither is
# set, a random one is generated and printed once. Safe to re-run.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "${PROD_DATABASE_URL:-}" ]]; then
  SCHEMA=prisma/schema.prod.prisma
  restore_local_client() { bunx prisma generate >/dev/null 2>&1 || true; }
  trap restore_local_client EXIT

  echo "→ Generating PostgreSQL Prisma client…"
  bunx prisma generate --schema "$SCHEMA" >/dev/null
  export DATABASE_URL="$PROD_DATABASE_URL"
fi

bun scripts/set-admin-password.ts
