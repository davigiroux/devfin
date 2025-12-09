'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerSchema } from '@/lib/validations/auth'
import { Input } from '@/components/ui'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validar inputs
      const validatedData = registerSchema.parse({
        email,
        password,
        confirmPassword,
        nome_completo: nomeCompleto,
      })

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            nome_completo: validatedData.nome_completo,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Redirecionar para o dashboard
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) {
        setError((err as { errors: { message: string }[] }).errors[0].message)
      } else {
        setError('Erro ao criar conta')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-blue-100 dark:from-background dark:to-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-md dark:shadow-none dark:border dark:border-border">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Criar Conta
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Registre-se no DevFin
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label htmlFor="nome_completo" className="sr-only">
                Nome Completo
              </label>
              <Input
                id="nome_completo"
                name="nome_completo"
                type="text"
                required
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                className="sm:text-sm"
                placeholder="Nome Completo"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sm:text-sm"
                placeholder="Senha"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmar Senha
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="sm:text-sm"
                placeholder="Confirmar Senha"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/90"
            >
              Já tem uma conta? Faça login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
