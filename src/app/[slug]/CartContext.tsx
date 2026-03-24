"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { useParams } from "next/navigation"

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
  options: {
    modifierId: string
    groupName: string
    modifierName: string
    price: number
  }[]
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, delta: number) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const slug = params?.slug as string
  const STORAGE_KEY = `zapieat.cart.${slug}`
  const STORAGE_KEY_LEGACY = `zasfood.cart.${slug}`

  const [items, setItems] = useState<CartItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && slug) {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY_LEGACY)
      if (saved) {
        try {
          setItems(JSON.parse(saved))
        } catch (e) {
          console.error("Error loading cart", e)
        }
      }
      setIsInitialized(true)
    }
  }, [slug, STORAGE_KEY, STORAGE_KEY_LEGACY])

  // Save to localStorage when items change
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, isInitialized, STORAGE_KEY])

  const addItem = (item: CartItem) => {
    setItems(prev => {
      // Check if exact same item (product + exact same options) already exists
      const itemOptionsSorted = [...item.options].sort((a,b) => a.modifierName.localeCompare(b.modifierName))
      const existingKey = JSON.stringify({ pid: item.productId, opt: itemOptionsSorted })
      
      const existingIdx = prev.findIndex(i => {
        const iOptionsSorted = [...i.options].sort((a,b) => a.modifierName.localeCompare(b.modifierName))
        const iKey = JSON.stringify({ pid: i.productId, opt: iOptionsSorted })
        return iKey === existingKey
      })

      if (existingIdx > -1) {
        const newItems = [...prev]
        const existingItem = { ...newItems[existingIdx] }
        existingItem.quantity += item.quantity
        newItems[existingIdx] = existingItem
        return newItems
      }
      
      return [...prev, item]
    })
  }

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const clearCart = () => setItems([])

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
