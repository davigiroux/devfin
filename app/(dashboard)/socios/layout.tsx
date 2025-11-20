import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sócios',
}

export default function SociosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
