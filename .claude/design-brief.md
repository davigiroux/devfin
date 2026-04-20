# DevFin — Design Brief for Claude Design

You have GitHub access. The repo is **davigiroux/devfin** (Next.js 14 App Router + TS + Tailwind + Supabase). Read it to see current pages, components, calculations, and types. Everything below is context to help you navigate — the actual experience direction I'll discuss with you interactively.

## What DevFin is

A financial management tool for **Brazilian single-owner / small-partnership service companies** under the **Lucro Presumido** tax regime. Target user is a founder/sócio who invoices clients (often exports in USD), pays recurring expenses, distributes pró-labore to partners, and needs to know: *how much actually lands in my pocket, and how much tax do I owe this month/quarter?*

Not an accounting system. Not double-entry. A personal-feeling financial cockpit for a founder who already has an accountant but wants clarity.

## Core features (today)

1. **Dashboard** — year-to-date revenue, taxes, expenses, net; quarterly breakdown; tax-composition charts; last 5 faturamentos.
2. **Faturamentos (revenue entries)** — CRUD. Each entry can be **domestic (BRL)** or **export (USD + PTAX)**. Taxes auto-computed on entry. Detail view shows tax breakdown, related monthly expenses (toggleable into net calc), and a "copy NF description" helper for exports.
3. **Despesas mensais** — recurring and one-off expenses, typed as `imposto` or `compromisso`. Per-month payment tracking (paid/pending, with `valor_pago` snapshot). Versioned edits (old version deactivated, new version created, history modal).
4. **Sócios** — partners with CPF and `percentual_participacao` (must sum to 100%). Includes an **INSS calculator** that distributes a total pró-labore across sócios by their share and applies the 2025 progressive INSS table.

## Tax math — the gotchas a designer must internalize

**Lucro Presumido — service sector rates applied on revenue (not profit):**
- IRPJ 4.8% · CSLL 2.88% · PIS 0.65% · COFINS 3% → **11.33% total** domestic.
- **Exports: PIS + COFINS = 0** → only IRPJ + CSLL (7.68%). The UI must make this exemption visible/understandable.

**The NF vs. bank distinction (critical, and where users get confused):**
- For exports, the **invoice (nota fiscal)** is issued in BRL using `valor_usd × cotação PTAX` on the invoice date. Taxes are computed on **this declared NF value**.
- The **amount that hits the bank** (`valor_recebido`) arrives later, at a different exchange rate, minus bank/wire fees. It's almost never equal to the NF value.
- Net cash = `valor_recebido − impostos(valor_nota_fiscal)`. The tax base and the cash base are *different numbers*. Design must not conflate them.
- `valor_recebido` is **often filled later** (export issued today, money arrives next week). The UI must gracefully handle a "pending receipt" state — don't force it at creation.

**PTAX** is the Banco Central USD/BRL official rate (sell side). Fetched from `olinda.bcb.gov.br`. Only published after ~13:30 BRT; weekends/holidays have none. Cache and fall back to previous business day.

**INSS on pró-labore** — 2025 progressive table:
- 7.5% up to R$1.412 · 9% up to R$2.666,68 · 12% up to R$4.000,03 · 14% up to the **teto R$7.786,02**.
- Anything above the teto is not taxed → high pró-labore → low *effective* rate. Worth surfacing the effective % to prevent user confusion.
- "Recommended minimum pró-labore" = `salário mínimo × nº de sócios`. Users want a nudge toward this minimum.

**Aliquotas are presumption-based**, not profit-based. A user with a bad month still owes the full 11.33% on revenue. Design should avoid framing taxes as "a share of profit" — they're a share of revenue.

**Expenses — recurrence & versioning:**
- Recorrente expenses apply from `effective_from` forward, every month, until deactivated.
- One-off expenses are pinned to a specific `mes_referencia`/`ano_referencia`.
- Editing a recurring expense **versions** it (old version deactivated, new version starts). Payment history survives across versions but UI currently doesn't show the full lineage well.
- `valor_pago` is a snapshot taken when a user marks a month paid — future edits to the expense amount do NOT change past paid records.

**What's *not* tracked today (worth flagging as potential future surface area, not requirements):**
- Distribuição de lucros (profit distribution to sócios beyond pró-labore).
- IRRF / retenção na fonte (withholding by the payer).
- DARF generation / payment deadlines.
- Integration with accountant export formats.

## Data shape (for your context)

- `faturamentos`: `data`, `valor_bruto`, `irpj`, `csll`, `pis`, `cofins`, `total_impostos`, `exportacao`, `valor_usd`, `cotacao_ptax`, `valor_nota_fiscal`, `valor_recebido`.
- `despesas_mensais`: `descricao`, `tipo`, `valor`, `dia_vencimento`, `recorrente`, `mes_referencia`, `ano_referencia`, `effective_from`, `ativa`, `version`, `previous_version_id`.
- `pagamentos_despesas`: `despesa_id`, `mes_referencia`, `ano_referencia`, `pago`, `data_pagamento`, `valor_pago`.
- `socios`: `nome`, `cpf`, `percentual_participacao`.
- `ptax_rates`: `date`, `rate_venda`.

Calculation logic lives in `/lib/calculations/` (impostos, inss, caixa, aggregations) — these are pure functions, well-tested, and should be treated as the source of truth. Don't redesign them; design *around* them.

## Brazilian formatting (non-negotiable)

- Currency: `R$ 1.234,56` (dot thousands, comma decimal, R$ prefix).
- Dates: `DD/MM/YYYY`.
- CPF: `XXX.XXX.XXX-XX`.
- Month names, weekdays, all copy in **pt-BR**.
- Fiscal calendar: quarters matter (IRPJ/CSLL are quarterly apuração).

## Design goals (intentionally light — we'll talk)

- **Simpler, beautiful, delightful.** Reduce cognitive load for a founder who opens the app once a week.
- Make the **NF-vs-received** duality feel natural, not like two competing numbers.
- Make **pending states** (export awaiting receipt, expense awaiting payment) feel intentional, not broken.
- **Empty states** and first-run should guide, not dump a blank dashboard.
- Keep the calculation primitives; rethink the surface.

## What I want from you

Read the repo first. Then ask me about the experience direction before proposing mocks — I have opinions but want to hear yours. Flag anywhere you think the current data model constrains good design, so I can weigh schema changes against UX wins.
