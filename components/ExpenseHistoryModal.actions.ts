'use server'

import { and, desc, eq, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db/client'
import { despesas_mensais, pagamentos_despesas } from '@/lib/db/schema'

async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Não autenticado')
  return session.user.id
}

export async function loadExpenseHistory(despesaId: string) {
  const userId = await requireUserId()

  const [current] = await db
    .select()
    .from(despesas_mensais)
    .where(
      and(eq(despesas_mensais.id, despesaId), eq(despesas_mensais.usuario_id, userId)),
    )
    .limit(1)
  if (!current) return { versions: [], pagamentos: [] }

  const versions = [current]

  let prevId: string | null = current.previous_version_id
  while (prevId) {
    const [prev] = await db
      .select()
      .from(despesas_mensais)
      .where(
        and(eq(despesas_mensais.id, prevId), eq(despesas_mensais.usuario_id, userId)),
      )
      .limit(1)
    if (!prev) break
    versions.push(prev)
    prevId = prev.previous_version_id
  }

  const future = await db
    .select()
    .from(despesas_mensais)
    .where(
      and(
        eq(despesas_mensais.previous_version_id, despesaId),
        eq(despesas_mensais.usuario_id, userId),
      ),
    )
  versions.push(...future)

  versions.sort((a, b) => b.version - a.version)

  const ids = versions.map((v) => v.id)
  const pagamentos = ids.length
    ? await db
        .select()
        .from(pagamentos_despesas)
        .where(inArray(pagamentos_despesas.despesa_id, ids))
        .orderBy(desc(pagamentos_despesas.ano_referencia), desc(pagamentos_despesas.mes_referencia))
    : []

  return { versions, pagamentos }
}
