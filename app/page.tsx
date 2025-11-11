import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">DevFin</h1>
          <p className="text-xl text-gray-600 mb-8">
            Gestão Financeira Inteligente para sua Empresa
          </p>
          <div className="space-x-4">
            <Link
              href="/login"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition"
            >
              Criar Conta
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Cálculo de Impostos</h3>
            <p className="text-gray-600">
              Calcule automaticamente IRPJ, CSLL, PIS e COFINS baseado no Lucro Presumido
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-bold mb-2">Gestão de Sócios</h3>
            <p className="text-gray-600">
              Gerencie sócios e calcule INSS pró-labore proporcional automaticamente
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">Faturamentos</h3>
            <p className="text-gray-600">
              Registre e acompanhe seus faturamentos mensais com impostos calculados
            </p>
          </div>
        </div>

        <div className="mt-16 text-center text-gray-600">
          <p>Sistema desenvolvido para gestão financeira simplificada</p>
        </div>
      </div>
    </div>
  )
}
