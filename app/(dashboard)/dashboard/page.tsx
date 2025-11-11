import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Buscar dados do usuário
  const { data: userData } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user!.id)
    .single()

  // Buscar faturamentos recentes
  const { data: faturamentos, count: totalFaturamentos } = await supabase
    .from('faturamentos')
    .select('*', { count: 'exact' })
    .eq('usuario_id', user!.id)
    .order('data', { ascending: false })
    .limit(5)

  // Calcular totais
  const totalBruto = faturamentos?.reduce((acc, f) => acc + Number(f.valor_bruto), 0) || 0
  const totalImpostos = faturamentos?.reduce((acc, f) => acc + Number(f.total_impostos), 0) || 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo, {userData?.nome_completo || 'Usuário'}!
        </h1>
        <p className="text-gray-600">Visão geral da sua empresa</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Total de Faturamentos
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {totalFaturamentos || 0}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Faturamento Bruto
          </div>
          <div className="text-3xl font-bold text-green-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(totalBruto)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Total de Impostos
          </div>
          <div className="text-3xl font-bold text-red-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(totalImpostos)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Faturamentos Recentes
          </h2>
          <Link
            href="/faturamentos"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            Ver todos
          </Link>
        </div>

        {faturamentos && faturamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Bruto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impostos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Líquido
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {faturamentos.map((faturamento) => {
                  const liquido = Number(faturamento.valor_bruto) - Number(faturamento.total_impostos)
                  return (
                    <tr key={faturamento.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(faturamento.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(faturamento.valor_bruto))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(faturamento.total_impostos))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(liquido)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhum faturamento cadastrado ainda</p>
            <Link
              href="/faturamentos"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
            >
              Cadastrar Faturamento
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
