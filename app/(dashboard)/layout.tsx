import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ThemeToggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  const user = session.user

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow-sm border-b border">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="flex items-center">
                <Image src="/logo.svg" alt="DevFin" width={160} height={40} priority />
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/faturamentos"
                  className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                >
                  Faturamentos
                </Link>
                <Link
                  href="/despesas"
                  className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                >
                  Despesas
                </Link>
                <Link
                  href="/socios"
                  className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sócios
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/login' })
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
