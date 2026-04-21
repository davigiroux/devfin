'use server'

import { and, asc, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db/client'
import { despesas_mensais, pagamentos_despesas } from '@/lib/db/schema'

async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Não autenticado')
  return session.user.id
}

export async function listDespesas() {
  const userId = await requireUserId()
  return db
    .select()
    .from(despesas_mensais)
    .where(eq(despesas_mensais.usuario_id, userId))
    .orderBy(asc(despesas_mensais.tipo), asc(despesas_mensais.descricao))
}

export async function listPagamentosForMonth(mes: number, ano: number) {
  await requireUserId()
  return db
    .select()
    .from(pagamentos_despesas)
    .where(
      and(
        eq(pagamentos_despesas.mes_referencia, mes),
        eq(pagamentos_despesas.ano_referencia, ano),
      ),
    )
}

export type DespesaInput = {
  descricao: string
  tipo: 'imposto' | 'compromisso'
  valor: number
  dia_vencimento: number
  recorrente: boolean
  mes_referencia: number | null
  ano_referencia: number | null
  effective_from: string
}

export async function createDespesa(input: DespesaInput) {
  const userId = await requireUserId()
  await db.insert(despesas_mensais).values({
    ...input,
    usuario_id: userId,
  })
}

export async function createDespesaNewVersion(
  previousId: string,
  previousVersion: number,
  input: DespesaInput,
) {
  const userId = await requireUserId()
  await db.transaction(async (tx) => {
    await tx
      .update(despesas_mensais)
      .set({ ativa: false })
      .where(
        and(eq(despesas_mensais.id, previousId), eq(despesas_mensais.usuario_id, userId)),
      )
    await tx.insert(despesas_mensais).values({
      ...input,
      version: previousVersion + 1,
      previous_version_id: previousId,
      usuario_id: userId,
    })
  })
}

export async function toggleDespesaAtiva(id: string, ativa: boolean) {
  const userId = await requireUserId()
  await db
    .update(despesas_mensais)
    .set({ ativa })
    .where(and(eq(despesas_mensais.id, id), eq(despesas_mensais.usuario_id, userId)))
}

export type PagamentoPatch = {
  pago: boolean
  data_pagamento: string | null
  valor_pago?: number | null
}

export async function upsertPagamento(
  despesa_id: string,
  mes: number,
  ano: number,
  patch: PagamentoPatch,
) {
  await requireUserId()
  const [existing] = await db
    .select()
    .from(pagamentos_despesas)
    .where(
      and(
        eq(pagamentos_despesas.despesa_id, despesa_id),
        eq(pagamentos_despesas.mes_referencia, mes),
        eq(pagamentos_despesas.ano_referencia, ano),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(pagamentos_despesas)
      .set({
        pago: patch.pago,
        data_pagamento: patch.data_pagamento,
        valor_pago: patch.valor_pago ?? null,
      })
      .where(eq(pagamentos_despesas.id, existing.id))
    return
  }

  await db.insert(pagamentos_despesas).values({
    despesa_id,
    mes_referencia: mes,
    ano_referencia: ano,
    pago: patch.pago,
    data_pagamento: patch.data_pagamento,
    valor_pago: patch.valor_pago ?? null,
  })
}
