import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

/**
 * Google is only registered when both credentials exist. Previously the provider
 * was always registered (with `undefined` credentials cast to string), so
 * /api/auth/providers always reported Google as available and users hit an
 * opaque `invalid_client` error on Google's side instead of a clear message.
 */
export const isGoogleAuthConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
)

if (!isGoogleAuthConfigured) {
  console.error('[auth] AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are not set - Google sign-in is disabled.')
}
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.error('[auth] AUTH_SECRET is not set - sign-in will fail with a Configuration error.')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter still persists users/accounts in the database, but the session
  // itself lives in a signed JWT cookie. This avoids a database round-trip on
  // every session check (fragile with serverless + pooled Supabase connections).
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  providers: isGoogleAuthConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID as string,
          clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],
  pages: {
    signIn: '/',
    error: '/',
  },
  logger: {
    // Surfaces the real cause (redirect mismatch, adapter/database errors...) in Netlify function logs.
    error(error) {
      console.error('[auth][error]', error.name, error.message, (error as { cause?: unknown }).cause ?? '')
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        ;(session.user as { id?: string }).id = token.sub
      }
      return session
    },
  },
})
