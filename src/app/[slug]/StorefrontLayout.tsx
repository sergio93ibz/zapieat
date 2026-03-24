"use client"

import React from "react"
import { CartProvider } from "./CartContext"
import { CookieBanner } from "@/components/storefront/CookieBanner"

export function StorefrontLayout({ children, slug }: { children: React.ReactNode; slug?: string }) {
  return (
    <CartProvider>
      {children}
      {slug && <CookieBanner restaurantSlug={slug} />}
    </CartProvider>
  )
}
