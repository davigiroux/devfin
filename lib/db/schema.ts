import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

// Postgres numeric arrives as string on the wire; domain code treats money as number.
// This wrapper parses on read and stringifies on write.
const numericAsNumber = (precision: number, scale: number) =>
  customType<{ data: number; driverData: string }>({
    dataType: () => `numeric(${precision}, ${scale})`,
    fromDriver: (v) => (typeof v === 'string' ? Number(v) : (v as number)),
    toDriver: (v) => v.toString(),
  })

const money = numericAsNumber(15, 2)
const rate = numericAsNumber(10, 4)
const percent = numericAsNumber(5, 2)

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nome_completo: text('nome_completo'),
  password_hash: text('password_hash'),
  email_verified: timestamp('email_verified', { withTimezone: true, mode: 'string' }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

export const socios = pgTable(
  'socios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    cpf: text('cpf').notNull().unique(),
    percentual_participacao: percent('percentual_participacao').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    cpfIdx: index('idx_socios_cpf').on(t.cpf),
    percentualCheck: check(
      'socios_percentual_check',
      sql`${t.percentual_participacao} >= 0 AND ${t.percentual_participacao} <= 100`,
    ),
  }),
)

export const faturamentos = pgTable(
  'faturamentos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    data: date('data').notNull(),
    valor_bruto: money('valor_bruto').notNull(),
    irpj: money('irpj').notNull().default(0),
    csll: money('csll').notNull().default(0),
    pis: money('pis').notNull().default(0),
    cofins: money('cofins').notNull().default(0),
    total_impostos: money('total_impostos').notNull().default(0),
    exportacao: boolean('exportacao').notNull().default(false),
    valor_usd: money('valor_usd'),
    cotacao_ptax: rate('cotacao_ptax'),
    valor_nota_fiscal: money('valor_nota_fiscal'),
    valor_recebido: money('valor_recebido'),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    usuarioIdx: index('idx_faturamentos_usuario_id').on(t.usuario_id),
    dataIdx: index('idx_faturamentos_data').on(t.data),
    valorBrutoCheck: check('faturamentos_valor_bruto_check', sql`${t.valor_bruto} >= 0`),
    exportCheck: check(
      'check_export_currency_fields',
      sql`${t.exportacao} = false OR (${t.valor_usd} IS NOT NULL AND ${t.cotacao_ptax} IS NOT NULL AND ${t.valor_nota_fiscal} IS NOT NULL AND ${t.valor_recebido} IS NOT NULL)`,
    ),
  }),
)

export const despesas_mensais = pgTable(
  'despesas_mensais',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    descricao: text('descricao').notNull(),
    tipo: text('tipo', { enum: ['imposto', 'compromisso'] }).notNull(),
    valor: money('valor').notNull(),
    dia_vencimento: integer('dia_vencimento').notNull(),
    recorrente: boolean('recorrente').notNull().default(true),
    mes_referencia: integer('mes_referencia'),
    ano_referencia: integer('ano_referencia'),
    ativa: boolean('ativa').notNull().default(true),
    effective_from: date('effective_from').notNull().default(sql`CURRENT_DATE`),
    version: integer('version').notNull().default(1),
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    previous_version_id: uuid('previous_version_id').references(
      (): AnyPgColumn => despesas_mensais.id,
      { onDelete: 'set null' },
    ),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    usuarioIdx: index('idx_despesas_usuario_id').on(t.usuario_id),
    prevVersionIdx: index('idx_despesas_previous_version').on(t.previous_version_id),
    diaCheck: check(
      'despesas_dia_vencimento_check',
      sql`${t.dia_vencimento} BETWEEN 1 AND 31`,
    ),
    valorCheck: check('despesas_valor_check', sql`${t.valor} >= 0`),
    mesCheck: check(
      'despesas_mes_referencia_check',
      sql`${t.mes_referencia} IS NULL OR (${t.mes_referencia} BETWEEN 1 AND 12)`,
    ),
  }),
)

export const pagamentos_despesas = pgTable(
  'pagamentos_despesas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    despesa_id: uuid('despesa_id')
      .notNull()
      .references(() => despesas_mensais.id, { onDelete: 'cascade' }),
    mes_referencia: integer('mes_referencia').notNull(),
    ano_referencia: integer('ano_referencia').notNull(),
    pago: boolean('pago').notNull().default(false),
    data_pagamento: date('data_pagamento'),
    valor_pago: money('valor_pago'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    despesaIdx: index('idx_pagamentos_despesa_id').on(t.despesa_id),
    uniqPerMonth: unique('pagamentos_despesa_month_unique').on(
      t.despesa_id,
      t.mes_referencia,
      t.ano_referencia,
    ),
    mesCheck: check(
      'pagamentos_mes_referencia_check',
      sql`${t.mes_referencia} BETWEEN 1 AND 12`,
    ),
  }),
)

export const ptax_rates = pgTable(
  'ptax_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull().unique(),
    rate_venda: rate('rate_venda').notNull(),
    fetched_at: timestamp('fetched_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    dateIdx: index('idx_ptax_rates_date').on(t.date),
    rateCheck: check('ptax_rate_positive', sql`${t.rate_venda} > 0`),
  }),
)
