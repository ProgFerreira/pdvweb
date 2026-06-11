import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authConfig } from "@/auth.config"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const { callbacks: authCallbacks, ...authConfigRest } = authConfig

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfigRest,
  callbacks: {
    ...authCallbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.tenantId = (user as { tenantId?: string }).tenantId
      }

      if (!token.tenantId && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tenantId: true, role: true },
        })
        if (dbUser?.tenantId) token.tenantId = dbUser.tenantId
        if (dbUser?.role) token.role = dbUser.role
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findFirst({
          where: {
            email: parsed.data.email,
            deletedAt: null,
            isActive: true,
          },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.password)
        if (!passwordMatch) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        }
      },
    }),
  ],
})
