import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Metadata } from 'next'
import DashboardCharts from '@/components/DashboardCharts'

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

  // Fetch all faturamentos for charts
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

  // Fetch all pagamentos
  const { data: pagamentos } = await supabase
    .from('pagamentos_despesas')
    .select('*')
    .order('ano_referencia', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo, {userData?.nome_completo || 'Usuário'}!
        </h1>
        <p className="text-gray-600">Dashboard financeiro completo</p>
      </div>

      {faturamentos && faturamentos.length > 0 ? (
        <DashboardCharts
          faturamentos={faturamentos}
          despesas={despesas || []}
          pagamentos={pagamentos || []}
        />
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500 mb-4">
            Nenhum faturamento cadastrado ainda
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Cadastre seus faturamentos para visualizar o dashboard
          </p>
          <Link
            href="/faturamentos"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
          >
            Cadastrar Faturamento
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <Link
          href="/faturamentos"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 transition"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Faturamentos
          </h3>
          <p className="text-gray-600 text-sm">
            Cadastrar e gerenciar receitas mensais
          </p>
        </Link>
        <Link
          href="/despesas"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 transition"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Despesas</h3>
          <p className="text-gray-600 text-sm">
            Controlar despesas e compromissos
          </p>
        </Link>
        <Link
          href="/socios"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 transition"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sócios</h3>
          <p className="text-gray-600 text-sm">
            Gerenciar sócios e distribuição de lucros
          </p>
        </Link>
      </div>
    </div>
  )
}
