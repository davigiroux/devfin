#!/usr/bin/env python3
"""Merge bcrypt password hashes from Supabase auth.users CSV dump into Neon's usuarios table.

CSV columns expected: id, email, encrypted_password, meta (raw_user_meta_data as JSON text)

Supabase stores bcrypt hashes in `encrypted_password` compatible with bcryptjs.compare().
"""
import argparse
import csv
import json
import subprocess
import sys


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--csv", required=True)
    p.add_argument("--db", required=True)
    args = p.parse_args()

    with open(args.csv, newline="") as f:
        rows = list(csv.DictReader(f))

    if not rows:
        print("No auth.users rows to merge.")
        return 0

    # Build a single SQL script (UPSERT on id).
    stmts = []
    for r in rows:
        uid = r["id"].strip()
        email = r["email"].strip().replace("'", "''")
        pwd = (r.get("encrypted_password") or "").strip().replace("'", "''")
        meta_raw = r.get("meta") or "{}"
        try:
            nome = json.loads(meta_raw).get("nome_completo") if meta_raw else None
        except json.JSONDecodeError:
            nome = None
        nome_sql = "NULL" if not nome else "'" + nome.replace("'", "''") + "'"

        stmts.append(f"""
INSERT INTO public.usuarios (id, email, nome_completo, password_hash)
VALUES ('{uid}', '{email}', {nome_sql}, {"NULL" if not pwd else f"'{pwd}'"})
ON CONFLICT (id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome_completo = COALESCE(public.usuarios.nome_completo, EXCLUDED.nome_completo);
""")

    sql = "BEGIN;\n" + "\n".join(stmts) + "\nCOMMIT;\n"
    result = subprocess.run(
        ["psql", args.db, "-v", "ON_ERROR_STOP=1"],
        input=sql, text=True, capture_output=True,
    )
    if result.returncode != 0:
        print("psql stderr:", result.stderr, file=sys.stderr)
        return result.returncode
    print(f"Merged {len(rows)} auth users.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
