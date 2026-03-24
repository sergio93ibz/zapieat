import { UserRole } from "@prisma/client"
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    role: UserRole
    restaurantId: string | null
    restaurantSlug: string | null
    isSuperadmin: boolean
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      restaurantId: string | null
      restaurantSlug: string | null
      isSuperadmin: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    role: UserRole
    restaurantId: string | null
    restaurantSlug: string | null
    isSuperadmin: boolean
  }
}
