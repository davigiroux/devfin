'use server'

import { asc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db/client'
import { socios } from '@/lib/db/schema'

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Não autenticado')
}

export async function listSocios() {
  await requireAuth()
  return db.select().from(socios).orderBy(asc(socios.created_at))
}

export async function createSocio(input: {
  nome: string
  cpf: string
  percentual_participacao: number
}) {
  await requireAuth()
  await db.insert(socios).values(input)
}
