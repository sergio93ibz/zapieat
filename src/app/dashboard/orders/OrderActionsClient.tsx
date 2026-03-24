"use client"

import React, { useTransition } from "react"
import { advanceOrderStatusAction, markAsCancelledAction, createMockOrderAction } from "./actions"
import { OrderStatus } from "@prisma/client"
import { Check, X, Bug } from "lucide-react"

export function AdvanceOrderButton({ orderId, currentStatus }: { orderId: string, currentStatus: OrderStatus }) {
  const [isPending, startTransition] = useTransition()

  const handleAdvance = () => {
    startTransition(() => {
      advanceOrderStatusAction(orderId, currentStatus)
    })
  }

  return (
    <button 
      onClick={handleAdvance}
      disabled={isPending}
      style={{ 
        backgroundColor: "rgba(34, 197, 94, 0.1)", 
        border: "1px solid rgba(34, 197, 94, 0.2)",
        color: "#22c55e", 
        padding: "0.25rem 0.5rem",
        borderRadius: "0.25rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        opacity: isPending ? 0.5 : 1
      }}
      title="Avanzar pedido a la siguiente fase"
    >
      <Check size={14} />
      <span>Avanzar</span>
    </button>
  )
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleCancel = () => {
    if(confirm("¿Seguro que quieres cancelar y eliminar este pedido del tablero?")) {
      startTransition(() => {
        markAsCancelledAction(orderId)
      })
    }
  }

  return (
    <button 
      onClick={handleCancel}
      disabled={isPending}
      style={{ 
        backgroundColor: "transparent", 
        border: "none",
        color: "#ef4444", 
        padding: "4px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isPending ? 0.5 : 1
      }}
      title="Cancelar pedido"
    >
      <X size={16} />
    </button>
  )
}

export function MockOrderButton() {
   const [isPending, startTransition] = useTransition()

   const handleMock = () => {
     startTransition(async () => {
       const res = await createMockOrderAction()
       if(res?.error) {
         alert(res.error)
       }
     })
   }

   return (
     <button 
      onClick={handleMock}
      disabled={isPending}
      style={{
        backgroundColor: "#292524",
        border: "1px solid rgba(255,255,255,0.05)",
        color: "#d6d3d1",
        padding: "0.3rem 0.8rem",
        borderRadius: "0.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        cursor: "pointer",
        fontSize: "0.8rem"
      }}
     >
       <Bug size={14} />
       {isPending ? "Generando..." : "Test: Crear Pedido Falso"}
     </button>
   )
}
