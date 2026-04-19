import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
  },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = user.id
      }
      return session
    },
  },
})
