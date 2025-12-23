import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Metadata } from 'next'
import YearSummaryCards from '@/components/dashboard/YearSummaryCards'
import LastFaturamentosTable from '@/components/dashboard/LastFaturamentosTable'
import QuarterlyView from '@/components/dashboard/QuarterlyView'
import TaxComparisonCharts from '@/components/dashboard/TaxComparisonCharts'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user data
  const { data: userData } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user!.id)
    .single()

  // Fetch all faturamentos
  const { data: faturamentos } = await supabase
    .from('faturamentos')
    .select('*')
    .eq('usuario_id', user!.id)
    .order('data', { ascending: true })

  // Fetch all despesas
  const { data: despesas } = await supabase
    .from('despesas_mensais')
    .select('*')
    .eq('usuario_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bem-vindo, {userData?.nome_completo || 'Usuário'}!
        </h1>
        <p className="text-muted-foreground">Dashboard financeiro completo</p>
      </div>

      {faturamentos && faturamentos.length > 0 ? (
        <>
          {/* Year Summary Cards */}
          <YearSummaryCards
            faturamentos={faturamentos}
            despesas={despesas || []}
          />

          {/* Last 5 Faturamentos Table */}
          <LastFaturamentosTable faturamentos={faturamentos} />

          {/* Quarterly View */}
          <QuarterlyView
            faturamentos={faturamentos}
            despesas={despesas || []}
          />

          {/* Tax Comparison Charts */}
          <TaxComparisonCharts faturamentos={faturamentos} />
        </>
      ) : (
        <div className="bg-card p-12 rounded-lg shadow-sm border text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum faturamento cadastrado ainda
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Cadastre seus faturamentos para visualizar o dashboard
          </p>
          <Link
            href="/faturamentos"
            className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition"
          >
            Cadastrar Faturamento
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link
          href="/faturamentos"
          className="bg-card p-6 rounded-lg shadow-sm border hover:border-ring transition"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Faturamentos
          </h3>
          <p className="text-muted-foreground text-sm">
            Cadastrar e gerenciar receitas mensais
          </p>
        </Link>
        <Link
          href="/despesas"
          className="bg-card p-6 rounded-lg shadow-sm border hover:border-ring transition"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">Despesas</h3>
          <p className="text-muted-foreground text-sm">
            Controlar despesas e compromissos
          </p>
        </Link>
        <Link
          href="/socios"
          className="bg-card p-6 rounded-lg shadow-sm border hover:border-ring transition"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">Sócios</h3>
          <p className="text-muted-foreground text-sm">
            Gerenciar sócios e distribuição de lucros
          </p>
        </Link>
      </div>
    </div>
  )
}
