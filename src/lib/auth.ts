import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { z } from "zod"
import { rateLimit } from "@/lib/rateLimit"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Avoid UntrustedHost errors behind proxies / in Docker
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          const ip =
            request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "unknown"
          const rl = await rateLimit({
            key: `login:${ip}`,
            limit: 10,
            windowSeconds: 15 * 60,
          })
          if (!rl.ok) return null

          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) return null

          const { email, password } = parsed.data

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) return null

          const passwordMatch = await bcrypt.compare(password, user.passwordHash)
          if (!passwordMatch) return null

          // Resolve restaurantId and slug for non-superadmin users
          let restaurantId: string | null = null
          let restaurantSlug: string | null = null
          if (user.role !== UserRole.SUPERADMIN) {
            const membership = await prisma.membership.findFirst({
              where: { userId: user.id },
              include: { restaurant: true },
              orderBy: { createdAt: "asc" },
            })
            restaurantId = membership?.restaurantId ?? null
            restaurantSlug = membership?.restaurant?.slug ?? null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            restaurantId,
            restaurantSlug,
            isSuperadmin: user.role === UserRole.SUPERADMIN,
          }
        } catch (err) {
          console.error("[Auth] Credentials authorize failed:", err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign in, enrich token from the authorize() return
      if (user) {
        token.userId = user.id as string
        token.role = (user as any).role
        token.restaurantId = (user as any).restaurantId
        token.restaurantSlug = (user as any).restaurantSlug
        token.isSuperadmin = (user as any).isSuperadmin
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.userId as string
        session.user.role = token.role as UserRole
        session.user.restaurantId = token.restaurantId as string | null
        session.user.restaurantSlug = token.restaurantSlug as string | null
        session.user.isSuperadmin = token.isSuperadmin as boolean
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
})
