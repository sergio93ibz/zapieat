"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import styles from "./orders.module.css"
import { Clock, ChefHat, HandPlatter, Bike, User as UserIcon, Volume2, VolumeX } from "lucide-react"
import { MockOrderButton } from "./OrderActionsClient"
import { OrderStatus } from "@prisma/client"
import { OrderDetailsModal } from "./OrderDetailsModal"

type OrderItemDTO = {
  quantity: number
  productNameSnapshot: string
}

export type OrderDTO = {
  id: string
  orderNumber: number
  status: OrderStatus
  createdAt: string
  customerName: string | null
  isDelivery: boolean
  type?: string
  tableName?: string | null
  total: string
  items: OrderItemDTO[]
}

const FINAL_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED", "DELIVERED"]

function formatOrderNumber(n: number): string {
  return `#${String(n).padStart(4, "0")}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function safeMoney(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : String(value)
}

function createBellPlayer() {
  let ctx: AudioContext | null = null
  return {
    async enable() {
      if (typeof window === "undefined") return
      if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (ctx.state === "suspended") await ctx.resume()
    },
    async play() {
      if (typeof window === "undefined") return
      if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (ctx.state === "suspended") {
        // Browser may block without a user gesture.
        return
      }

      const now = ctx.currentTime

      const out = ctx.createGain()
      out.gain.setValueAtTime(0.0001, now)
      out.gain.exponentialRampToValueAtTime(0.35, now + 0.02)
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.25)

      const hp = ctx.createBiquadFilter()
      hp.type = "highpass"
      hp.frequency.setValueAtTime(250, now)

      hp.connect(out)
      out.connect(ctx.destination)

      const freqs = [
        { f: 740, d: 1.1 },
        { f: 932, d: 1.25 },
        { f: 1175, d: 1.35 },
        { f: 1480, d: 1.45 },
      ]

      for (const p of freqs) {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = "sine"
        o.frequency.setValueAtTime(p.f, now)
        o.detune.setValueAtTime((Math.random() - 0.5) * 8, now)

        g.gain.setValueAtTime(0.0001, now)
        g.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, now + p.d)

        o.connect(g)
        g.connect(hp)
        o.start(now)
        o.stop(now + p.d)
      }
    },
  }
}

export function OrdersBoardClient({
  initialOrders,
  pollIntervalMs = 5000,
}: {
  initialOrders: OrderDTO[]
  pollIntervalMs?: number
}) {
  const SOUND_KEY = "zapieat.orders.sound"
  const SOUND_KEY_LEGACY = "zasfood.orders.sound"

  const [orders, setOrders] = useState<OrderDTO[]>(initialOrders)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now())
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    const v = window.localStorage.getItem(SOUND_KEY)
    if (v !== null) return v === "1"
    return window.localStorage.getItem(SOUND_KEY_LEGACY) === "1"
  })
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(() => new Set())
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const inFlightRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)))
  const baseTitleRef = useRef<string | null>(null)
  const beepRef = useRef<ReturnType<typeof createBellPlayer> | null>(null)

  if (!beepRef.current) beepRef.current = createBellPlayer()

  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => !FINAL_STATUSES.includes(o.status))
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [orders])

  const pendingOrders = useMemo(
    () => activeOrders.filter((o) => o.status === "PENDING_PAYMENT" || o.status === "PAID"),
    [activeOrders]
  )
  const preparingOrders = useMemo(
    () => activeOrders.filter((o) => o.status === "PREPARING"),
    [activeOrders]
  )
  const readyOrders = useMemo(() => activeOrders.filter((o) => o.status === "READY"), [activeOrders])
  const deliveringOrders = useMemo(
    () => activeOrders.filter((o) => o.status === "DELIVERING"),
    [activeOrders]
  )

  useEffect(() => {
    if (typeof document === "undefined") return
    if (!baseTitleRef.current) baseTitleRef.current = document.title
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    const base = baseTitleRef.current ?? document.title
    const count = newOrderIds.size
    document.title = count > 0 ? `(${count}) ${base}` : base

    return () => {
      document.title = base
    }
  }, [newOrderIds])

  async function refresh() {
    if (inFlightRef.current) return
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return

    inFlightRef.current = true
    try {
      const res = await fetch("/api/orders?take=100", { cache: "no-store" })
      if (!res.ok) return
      const json = (await res.json()) as { orders: any[] }

      const next: OrderDTO[] = (json.orders ?? []).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: new Date(o.createdAt).toISOString(),
        customerName: o.customerName ?? null,
        isDelivery: Boolean(o.isDelivery),
        type: o.type,
        tableName: o.tableName ?? (o.table?.name ?? null),
        total: String(o.total),
        items: (o.items ?? []).map((it: any) => ({
          quantity: it.quantity,
          productNameSnapshot: it.productNameSnapshot,
        })),
      }))

      // Detect new orders since last refresh
      const prevSeen = seenIdsRef.current
      const newlyArrived = next.filter(
        (o) => !prevSeen.has(o.id) && (o.status === "PENDING_PAYMENT" || o.status === "PAID")
      )

      if (newlyArrived.length > 0) {
        setNewOrderIds((prev) => {
          const copy = new Set(prev)
          for (const o of newlyArrived) copy.add(o.id)
          return copy
        })

        if (soundEnabled) {
          await beepRef.current?.play()
        }

        // Auto-clear highlight after 60s
        for (const o of newlyArrived) {
          window.setTimeout(() => {
            setNewOrderIds((prev) => {
              if (!prev.has(o.id)) return prev
              const copy = new Set(prev)
              copy.delete(o.id)
              return copy
            })
          }, 60_000)
        }
      }

      seenIdsRef.current = new Set(next.map((o) => o.id))

      // Cleanup new-order markers if order disappears or changes out of pending/paid
      setNewOrderIds((prev) => {
        if (prev.size === 0) return prev
        const valid = new Set(
          next
            .filter((o) => o.status === "PENDING_PAYMENT" || o.status === "PAID")
            .map((o) => o.id)
        )
        const copy = new Set<string>()
        for (const id of prev) {
          if (valid.has(id)) copy.add(id)
        }
        return copy
      })

      setOrders(next)
      setLastUpdatedAt(Date.now())
    } finally {
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, pollIntervalMs)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs, soundEnabled])

  const OrderCard = ({ order }: { order: OrderDTO }) => {
    const isNew = newOrderIds.has(order.id)
    return (
      <div
        className={`${styles.orderCard} ${isNew ? styles.orderCardNew : ""}`}
        onClick={() => {
          setSelectedOrderId(order.id)
          setModalOpen(true)
          setNewOrderIds((prev) => {
            if (!prev.has(order.id)) return prev
            const copy = new Set(prev)
            copy.delete(order.id)
            return copy
          })
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setSelectedOrderId(order.id)
            setModalOpen(true)
          }
        }}
        style={{ cursor: "pointer" }}
        title="Ver detalle"
      >
        <div className={styles.orderHeader}>
          <div>
            <span className={styles.orderNumber}>{formatOrderNumber(order.orderNumber)}</span>
            <div className={styles.customerInfo}>
              <UserIcon size={14} />
              {order.customerName || "Invitado"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
            <div className={styles.orderTime}>{formatTime(order.createdAt)}</div>
          </div>
        </div>

        <div className={styles.orderItems}>
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={idx} className={styles.itemLine}>
              <span>
                {item.quantity}x {item.productNameSnapshot}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <span style={{ fontSize: "0.7rem", color: "#78716c", marginTop: "0.25rem" }}>
              +{order.items.length - 3} articulos mas
            </span>
          )}
        </div>

        <div className={styles.orderFooter}>
          <span className={order.type === 'TABLE' ? styles.badgeTable : (order.isDelivery ? styles.badgeDelivery : styles.badgePickup)}>
            {order.type === 'TABLE' ? `Mesa ${order.tableName}` : (order.isDelivery ? "Delivery" : "Recoger")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className={styles.orderTotal}>{safeMoney(order.total)}€</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <OrderDetailsModal
        orderId={selectedOrderId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAfterMutate={() => {
          refresh()
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <MockOrderButton />
          <button
            type="button"
            onClick={() => {
              setNewOrderIds(new Set())
            }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#d6d3d1",
              padding: "0.35rem 0.6rem",
              borderRadius: "0.6rem",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
            title="Marcar pedidos nuevos como vistos"
          >
            Limpiar avisos ({newOrderIds.size})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ color: "#78716c", fontSize: "0.8rem" }}>
            Actualizado: {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <button
            type="button"
            onClick={async () => {
              const next = !soundEnabled
              setSoundEnabled(next)
              window.localStorage.setItem(SOUND_KEY, next ? "1" : "0")
              if (next) await beepRef.current?.enable()
            }}
            style={{
              background: soundEnabled ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: soundEnabled ? "#22c55e" : "#a8a29e",
              padding: "0.35rem 0.6rem",
              borderRadius: "0.6rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
            }}
            title={soundEnabled ? "Sonido activado" : "Sonido desactivado"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            Sonido
          </button>
        </div>
      </div>

      <div className={styles.kanbanContainer}>
        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.columnTitle}>
              <Clock size={18} color="#f97316" />
              Nuevos
            </div>
            <span className={styles.columnCount}>{pendingOrders.length}</span>
          </div>
          <div className={styles.columnBody}>
            {pendingOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
            {pendingOrders.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "#78716c",
                  fontSize: "0.875rem",
                  marginTop: "2rem",
                }}
              >
                No hay pedidos nuevos.
              </p>
            )}
          </div>
        </div>

        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.columnTitle}>
              <ChefHat size={18} color="#eab308" />
              Preparando
            </div>
            <span className={styles.columnCount}>{preparingOrders.length}</span>
          </div>
          <div className={styles.columnBody}>
            {preparingOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </div>

        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.columnTitle}>
              <HandPlatter size={18} color="#22c55e" />
              Para Recogida
            </div>
            <span className={styles.columnCount}>{readyOrders.length}</span>
          </div>
          <div className={styles.columnBody}>
            {readyOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </div>

        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.columnTitle}>
              <Bike size={18} color="#38bdf8" />
              En Reparto
            </div>
            <span className={styles.columnCount}>{deliveringOrders.length}</span>
          </div>
          <div className={styles.columnBody}>
            {deliveringOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
