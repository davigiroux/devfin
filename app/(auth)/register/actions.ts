'use server'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { usuarios } from '@/lib/db/schema'
import { registerSchema } from '@/lib/validations/auth'

export type RegisterResult = { ok: true } | { ok: false; error: string }

export async function registerUser(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const email = parsed.data.email.trim().toLowerCase()

  const [existing] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1)
  if (existing) {
    return { ok: false, error: 'Email já cadastrado' }
  }

  const password_hash = await bcrypt.hash(parsed.data.password, 10)

  await db.insert(usuarios).values({
    email,
    nome_completo: parsed.data.nome_completo,
    password_hash,
  })

  return { ok: true }
}
