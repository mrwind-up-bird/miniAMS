import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "./db"
import "@/types"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findFirst({
          where: { email: credentials.email as string },
        })

        if (!user) return null

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash,
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
          locale: user.locale,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tenantId = user.tenantId
        token.role = user.role
        token.locale = user.locale
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.tenantId = token.tenantId as string
      session.user.role = token.role as string
      session.user.locale = token.locale as string
      return session
    },
  },
})
