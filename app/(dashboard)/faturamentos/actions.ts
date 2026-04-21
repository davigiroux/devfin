'use server'

import { and, asc, desc, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db/client'
import { faturamentos, despesas_mensais } from '@/lib/db/schema'

async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Não autenticado')
  return session.user.id
}

export async function listFaturamentos() {
  const userId = await requireUserId()
  return db
    .select()
    .from(faturamentos)
    .where(eq(faturamentos.usuario_id, userId))
    .orderBy(desc(faturamentos.data))
}

export async function getFaturamento(id: string) {
  const userId = await requireUserId()
  const [row] = await db
    .select()
    .from(faturamentos)
    .where(and(eq(faturamentos.id, id), eq(faturamentos.usuario_id, userId)))
    .limit(1)
  return row ?? null
}

export async function getDespesasAtivasForUser() {
  const userId = await requireUserId()
  return db
    .select()
    .from(despesas_mensais)
    .where(
      and(eq(despesas_mensais.usuario_id, userId), eq(despesas_mensais.ativa, true)),
    )
    .orderBy(asc(despesas_mensais.descricao))
}

export type CreateFaturamentoInput = {
  data: string
  valor_bruto: number
  irpj: number
  csll: number
  pis: number
  cofins: number
  total_impostos: number
  exportacao: boolean
  valor_usd?: number | null
  cotacao_ptax?: number | null
  valor_nota_fiscal?: number | null
  valor_recebido?: number | null
}

export async function createFaturamento(input: CreateFaturamentoInput) {
  const userId = await requireUserId()
  await db.insert(faturamentos).values({
    ...input,
    valor_usd: input.valor_usd ?? null,
    cotacao_ptax: input.cotacao_ptax ?? null,
    valor_nota_fiscal: input.valor_nota_fiscal ?? null,
    valor_recebido: input.valor_recebido ?? null,
    usuario_id: userId,
  })
}

export async function updateFaturamentoRecebido(id: string, valor_recebido: number) {
  const userId = await requireUserId()
  await db
    .update(faturamentos)
    .set({ valor_recebido })
    .where(and(eq(faturamentos.id, id), eq(faturamentos.usuario_id, userId)))
}

export async function deleteFaturamento(id: string) {
  const userId = await requireUserId()
  await db
    .delete(faturamentos)
    .where(and(eq(faturamentos.id, id), eq(faturamentos.usuario_id, userId)))
}
