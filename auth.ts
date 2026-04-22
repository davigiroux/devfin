import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { usuarios } from '@/lib/db/schema'
import authConfig from './auth.config'

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null

        const [user] = await db
          .select({
            id: usuarios.id,
            email: usuarios.email,
            nome_completo: usuarios.nome_completo,
            password_hash: usuarios.password_hash,
          })
          .from(usuarios)
          .where(eq(usuarios.email, email))
          .limit(1)

        if (!user?.password_hash) return null
        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.nome_completo ?? undefined,
        }
      },
    }),
  ],
})
