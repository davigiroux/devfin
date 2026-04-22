import type { NextAuthConfig } from 'next-auth'

// Edge-safe slice of the Auth.js config: no DB client, no bcrypt.
// Imported by middleware.ts so it stays in the edge runtime.
// The full config (auth.ts) extends this with the Credentials provider.
export default {
  trustHost: true,
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request
      const isLoggedIn = !!auth?.user
      const isDashboard = nextUrl.pathname.startsWith('/dashboard')
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register')

      if (isDashboard) return isLoggedIn
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
