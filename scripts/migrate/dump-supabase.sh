#!/usr/bin/env bash
# Dump live Supabase DB (schema + data + auth.users password hashes) prior to
# migrating DevFin to Neon. Run locally with SUPABASE_DB_URL set.
#
# Usage:
#   export SUPABASE_DB_URL="postgresql://postgres:PWD@db.<ref>.supabase.co:5432/postgres"
#   ./scripts/migrate/dump-supabase.sh
#
# Get the URL from Supabase dashboard: Project Settings > Database > Connection string
# (use the "Direct connection" URI so pg_dump can access the auth schema).
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL not set. See header of this script.}"

OUT_DIR="${OUT_DIR:-/tmp/devfin-dump}"
mkdir -p "$OUT_DIR"

echo "Dumping to $OUT_DIR"

echo "  -> public schema (DDL)"
pg_dump --schema-only --schema=public --no-owner --no-privileges \
  "$SUPABASE_DB_URL" > "$OUT_DIR/public_schema.sql"

echo "  -> public schema (data, INSERT form for portability)"
pg_dump --data-only --schema=public --no-owner --no-privileges \
  --inserts --column-inserts \
  "$SUPABASE_DB_URL" > "$OUT_DIR/public_data.sql"

echo "  -> auth.users (id, email, encrypted_password, raw_user_meta_data)"
psql "$SUPABASE_DB_URL" --csv -c \
  "SELECT id, email, encrypted_password, raw_user_meta_data::text AS meta \
   FROM auth.users WHERE deleted_at IS NULL ORDER BY created_at;" \
  > "$OUT_DIR/auth_users.csv"

echo "  -> row counts"
psql "$SUPABASE_DB_URL" -Atc "
  SELECT 'usuarios', count(*) FROM public.usuarios UNION ALL
  SELECT 'socios', count(*) FROM public.socios UNION ALL
  SELECT 'faturamentos', count(*) FROM public.faturamentos UNION ALL
  SELECT 'despesas_mensais', count(*) FROM public.despesas_mensais UNION ALL
  SELECT 'pagamentos_despesas', count(*) FROM public.pagamentos_despesas UNION ALL
  SELECT 'ptax_rates', count(*) FROM public.ptax_rates UNION ALL
  SELECT 'auth.users', count(*) FROM auth.users WHERE deleted_at IS NULL;" \
  > "$OUT_DIR/row_counts.txt"

echo
echo "Done. Files in $OUT_DIR:"
ls -la "$OUT_DIR"
echo
echo "Row counts (keep for verification after Neon load):"
cat "$OUT_DIR/row_counts.txt"
