#!/usr/bin/env bash
# Apply schema + load Supabase dump into a fresh Neon DB.
#
# Usage:
#   export NEON_DB_URL="postgresql://user:pwd@ep-xxx.neon.tech/dbname?sslmode=require"
#   export DUMP_DIR="/tmp/devfin-dump"   # output of dump-supabase.sh
#   ./scripts/migrate/load-neon.sh
#
# Safe to re-run on a clean DB; destructive if tables already contain data.
set -euo pipefail

: "${NEON_DB_URL:?NEON_DB_URL not set}"
: "${DUMP_DIR:?DUMP_DIR not set (output of dump-supabase.sh)}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "[1/4] Applying bootstrap schema to Neon"
psql "$NEON_DB_URL" -v ON_ERROR_STOP=1 -f "$REPO_ROOT/drizzle/0000_initial.sql"

echo "[2/4] Loading public schema data"
# Temporarily drop FK/check constraints during bulk load to avoid ordering issues.
psql "$NEON_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE public.faturamentos DROP CONSTRAINT IF EXISTS check_export_currency_fields;
ALTER TABLE public.faturamentos DROP CONSTRAINT IF EXISTS faturamentos_usuario_id_fkey;
ALTER TABLE public.despesas_mensais DROP CONSTRAINT IF EXISTS despesas_mensais_usuario_id_fkey;
ALTER TABLE public.despesas_mensais DROP CONSTRAINT IF EXISTS despesas_mensais_previous_version_id_fkey;
ALTER TABLE public.pagamentos_despesas DROP CONSTRAINT IF EXISTS pagamentos_despesas_despesa_id_fkey;
SQL

psql "$NEON_DB_URL" -v ON_ERROR_STOP=1 -f "$DUMP_DIR/public_data.sql"

echo "[3/4] Merging bcrypt password hashes from auth.users into usuarios"
python3 "$REPO_ROOT/scripts/migrate/merge_auth_users.py" \
  --csv "$DUMP_DIR/auth_users.csv" \
  --db  "$NEON_DB_URL"

echo "[4/4] Re-adding constraints"
psql "$NEON_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE public.faturamentos
  ADD CONSTRAINT check_export_currency_fields CHECK (
    exportacao = false OR
    (valor_usd IS NOT NULL AND cotacao_ptax IS NOT NULL
     AND valor_nota_fiscal IS NOT NULL AND valor_recebido IS NOT NULL)
  );
ALTER TABLE public.faturamentos
  ADD CONSTRAINT faturamentos_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.despesas_mensais
  ADD CONSTRAINT despesas_mensais_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.despesas_mensais
  ADD CONSTRAINT despesas_mensais_previous_version_id_fkey
    FOREIGN KEY (previous_version_id) REFERENCES public.despesas_mensais(id) ON DELETE SET NULL;
ALTER TABLE public.pagamentos_despesas
  ADD CONSTRAINT pagamentos_despesas_despesa_id_fkey
    FOREIGN KEY (despesa_id) REFERENCES public.despesas_mensais(id) ON DELETE CASCADE;
SQL

echo
echo "Neon row counts:"
psql "$NEON_DB_URL" -Atc "
  SELECT 'usuarios', count(*) FROM public.usuarios UNION ALL
  SELECT 'socios', count(*) FROM public.socios UNION ALL
  SELECT 'faturamentos', count(*) FROM public.faturamentos UNION ALL
  SELECT 'despesas_mensais', count(*) FROM public.despesas_mensais UNION ALL
  SELECT 'pagamentos_despesas', count(*) FROM public.pagamentos_despesas UNION ALL
  SELECT 'ptax_rates', count(*) FROM public.ptax_rates UNION ALL
  SELECT 'usuarios_with_hash', count(*) FROM public.usuarios WHERE password_hash IS NOT NULL;"

echo
echo "Compare against $DUMP_DIR/row_counts.txt to verify parity."
