import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Despesas',
}

export default function DespesasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
