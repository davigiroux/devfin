import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Detalhes do Faturamento',
}

export default function FaturamentoDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
