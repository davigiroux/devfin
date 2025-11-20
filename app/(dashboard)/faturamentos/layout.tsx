import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Faturamentos',
}

export default function FaturamentosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
