"use client"

import React, { useEffect, useMemo, useState, useTransition } from "react"
import { X, Phone, MapPin, StickyNote, Plus, CheckCircle2, Ban, ChefHat, HandPlatter, Bike, Check } from "lucide-react"
import { OrderStatus } from "@prisma/client"

import {
  addPositiveAdjustmentAction,
  advanceOrderStatusAction,
  markAsCancelledAction,
  markAsDeliveredAction,
  settlePendingAdjustmentsAction,
} from "./actions"

type OrderDetail = {
  id: string
  orderNumber: number
  status: OrderStatus
  createdAt: string
  isDelivery: boolean
  deliveryAddress: string | null
  deliveryNotes: string | null
  customerName: string | null
  customerPhone: string | null
  notes: string | null
  subtotal: string
  deliveryFee: string
  tax: string
  total: string
  items: Array<{
    id: string
    quantity: number
    productNameSnapshot: string
    unitPrice: string
    notes: string | null
    modifiers: Array<{ id: string; modifierNameSnapshot: string; price: string }>
  }>
  adjustments: Array<{
    id: string
    amount: string
    reason: string | null
    status: "PENDING" | "SETTLED" | "CANCELLED"
    createdAt: string
  }>
  pendingAdjustmentAmount: number
}

function safeMoney(v: unknown): string {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : String(v ?? "0")
}

function formatOrderNumber(n: number): string {
  return `#${String(n).padStart(4, "0")}`
}

const FINAL_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED", "DELIVERED"]

function isFinal(status: OrderStatus): boolean {
  return FINAL_STATUSES.includes(status)
}

type AdvanceAction = {
  label: string
  icon: React.ReactNode
  color: string
  borderColor: string
  bg: string
}

function getAdvanceAction(status: OrderStatus): AdvanceAction | null {
  if (status === "PENDING_PAYMENT" || status === "PAID") {
    return {
      label: "Enviar a Cocina",
      icon: <ChefHat size={16} />,
      color: "#f97316",
      borderColor: "rgba(249,115,22,0.35)",
      bg: "rgba(249,115,22,0.12)",
    }
  }
  if (status === "PREPARING") {
    return {
      label: "Marcar Listo",
      icon: <HandPlatter size={16} />,
      color: "#eab308",
      borderColor: "rgba(234,179,8,0.35)",
      bg: "rgba(234,179,8,0.1)",
    }
  }
  if (status === "READY") {
    return {
      label: "En Reparto",
      icon: <Bike size={16} />,
      color: "#38bdf8",
      borderColor: "rgba(56,189,248,0.35)",
      bg: "rgba(56,189,248,0.1)",
    }
  }
  if (status === "DELIVERING") {
    return {
      label: "Finalizar Entrega",
      icon: <Check size={16} />,
      color: "#22c55e",
      borderColor: "rgba(34,197,94,0.35)",
      bg: "rgba(34,197,94,0.1)",
    }
  }
  return null
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    PENDING_PAYMENT: { label: "Pendiente", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
    PAID:            { label: "Pagado",    color: "#f97316", bg: "rgba(249,115,22,0.1)" },
    PREPARING:       { label: "En Cocina", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    READY:           { label: "Listo",     color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    DELIVERING:      { label: "En Reparto",color: "#38bdf8", bg: "rgba(56,189,248,0.1)" },
    DELIVERED:       { label: "Entregado", color: "#78716c", bg: "rgba(120,113,108,0.1)" },
    CANCELLED:       { label: "Cancelado", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    REFUNDED:        { label: "Reembolsado",color: "#a78bfa",bg: "rgba(167,139,250,0.1)" },
  }
  const cfg = configs[status] ?? { label: status, color: "#a8a29e", bg: "rgba(255,255,255,0.05)" }
  return (
    <span
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "0.25rem 0.6rem",
        borderRadius: 8,
        color: cfg.color,
        background: cfg.bg,
        letterSpacing: "0.02em",
      }}
    >
      {cfg.label}
    </span>
  )
}

export function OrderDetailsModal({
  orderId,
  open,
  onClose,
  onAfterMutate,
}: {
  orderId: string | null
  open: boolean
  onClose: () => void
  onAfterMutate: () => void
}) {
  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [addOpen, setAddOpen] = useState(false)
  const [addAmount, setAddAmount] = useState("")
  const [addReason, setAddReason] = useState("")

  const advanceAction = useMemo(() => {
    if (!data) return null
    return getAdvanceAction(data.status)
  }, [data])

  const pendingAdjustments = useMemo(() => {
    return (data?.adjustments ?? []).filter((a) => a.status === "PENDING")
  }, [data])

  const isOrderFinal = useMemo(() => {
    if (!data) return false
    return isFinal(data.status)
  }, [data])

  async function load() {
    if (!orderId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" })
      if (!res.ok) {
        let detail = ""
        try {
          const json = await res.json()
          detail = json?.detail ?? json?.error ?? ""
        } catch {}
        if (res.status >= 500) {
          setError(`Error del servidor${detail ? `: ${detail}` : ""}. Si acabas de actualizar el schema, ejecuta 'npm run db:push'.`)
        } else if (res.status === 401) {
          setError("No autorizado. Por favor recarga la página e inicia sesión.")
        } else {
          setError("No se pudo cargar el pedido.")
        }
        setData(null)
        return
      }
      const json = (await res.json()) as { order: any }
      const o = json.order
      setData({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: new Date(o.createdAt).toISOString(),
        isDelivery: Boolean(o.isDelivery),
        deliveryAddress: o.deliveryAddress ?? null,
        deliveryNotes: o.deliveryNotes ?? null,
        customerName: o.customerName ?? null,
        customerPhone: o.customerPhone ?? null,
        notes: o.notes ?? null,
        subtotal: String(o.subtotal),
        deliveryFee: String(o.deliveryFee),
        tax: String(o.tax),
        total: String(o.total),
        items: (o.items ?? []).map((it: any) => ({
          id: it.id,
          quantity: it.quantity,
          productNameSnapshot: it.productNameSnapshot,
          unitPrice: String(it.unitPrice),
          notes: it.notes ?? null,
          modifiers: (it.modifiers ?? []).map((m: any) => ({
            id: m.id,
            modifierNameSnapshot: m.modifierNameSnapshot,
            price: String(m.price),
          })),
        })),
        adjustments: (o.adjustments ?? []).map((a: any) => ({
          id: a.id,
          amount: String(a.amount),
          reason: a.reason ?? null,
          status: a.status,
          createdAt: new Date(a.createdAt).toISOString(),
        })),
        pendingAdjustmentAmount: Number(o.pendingAdjustmentAmount ?? 0),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId])

  useEffect(() => {
    if (!open) {
      setAddOpen(false)
      setAddAmount("")
      setAddReason("")
      setError(null)
      setData(null)
    }
  }, [open])

  if (!open || !orderId) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          maxHeight: "92vh",
          overflow: "hidden",
          background: "#0c0a09",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ─── HEADER ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              {data ? formatOrderNumber(data.orderNumber) : "Pedido"}
            </div>
            {data && (
              <>
                <StatusBadge status={data.status} />
                <div style={{ color: "#57534e", fontSize: "0.8rem" }}>
                  {new Date(data.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {data.isDelivery ? "🛵 Domicilio" : "🏪 Recogida"}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#d6d3d1",
              cursor: "pointer",
              padding: "0.4rem",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── BODY ─── */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ color: "#a8a29e", textAlign: "center", padding: "2rem" }}>Cargando pedido...</div>
          )}
          {!loading && error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fecaca",
                padding: "0.75rem 1rem",
                borderRadius: 12,
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {!loading && data && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* ── Left column ── */}
              <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
                {/* Cliente */}
                <Section title="Cliente">
                  <div style={{ fontWeight: 700, color: "#e7e5e4", fontSize: "1rem" }}>
                    {data.customerName ?? "Invitado"}
                  </div>
                  {data.customerPhone && (
                    <a
                      href={`tel:${data.customerPhone}`}
                      style={{
                        marginTop: 8,
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                        color: "#a8a29e",
                        textDecoration: "none",
                        fontSize: "0.9rem",
                      }}
                    >
                      <Phone size={15} />
                      {data.customerPhone}
                    </a>
                  )}
                </Section>

                {/* Entrega */}
                <Section title="Entrega">
                  <div style={{ color: "#a8a29e", fontSize: "0.9rem", marginBottom: data.isDelivery ? 10 : 0 }}>
                    {data.isDelivery ? "🛵 A domicilio" : "🏪 Recogida en local"}
                  </div>
                  {data.isDelivery && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#e7e5e4" }}>
                      <MapPin size={15} style={{ marginTop: 2, flexShrink: 0, color: "#f97316" }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{data.deliveryAddress ?? "—"}</div>
                        {data.deliveryNotes && (
                          <div style={{ color: "#a8a29e", marginTop: 4, fontSize: "0.85rem" }}>
                            {data.deliveryNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Section>

                {/* Notas */}
                {data.notes && (
                  <Section title="Notas del cliente">
                    <div style={{ display: "flex", gap: 8, color: "#d6d3d1", fontSize: "0.9rem" }}>
                      <StickyNote size={15} style={{ marginTop: 2, flexShrink: 0, color: "#eab308" }} />
                      {data.notes}
                    </div>
                  </Section>
                )}

                {/* Totales */}
                <Section title="Totales">
                  <div style={{ display: "grid", gap: 6, color: "#a8a29e", fontSize: "0.9rem" }}>
                    <Row label="Subtotal" value={`${safeMoney(data.subtotal)}€`} />
                    <Row label="Envío" value={`${safeMoney(data.deliveryFee)}€`} />
                    <Row label="IVA" value={`${safeMoney(data.tax)}€`} />
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                    <Row
                      label="Total"
                      value={`${safeMoney(data.total)}€`}
                      bold
                      valueColor="#fafaf9"
                    />
                  </div>
                </Section>

                {/* Cargos adicionales */}
                {!isOrderFinal && (
                  <Section title="Cargos adicionales">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                      <span style={{ color: "#a8a29e", fontSize: "0.85rem" }}>Pendiente de cobro</span>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: "1.1rem",
                          color: data.pendingAdjustmentAmount > 0 ? "#f97316" : "#22c55e",
                        }}
                      >
                        {safeMoney(data.pendingAdjustmentAmount)}€
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <ActionBtn onClick={() => setAddOpen((v) => !v)} disabled={isPending}>
                        <Plus size={14} />
                        Añadir cargo
                      </ActionBtn>
                      <ActionBtn
                        onClick={() =>
                          startTransition(async () => {
                            const res = await settlePendingAdjustmentsAction(orderId)
                            if (res?.error) { setError(res.error); return }
                            await load()
                            onAfterMutate()
                          })
                        }
                        disabled={isPending || pendingAdjustments.length === 0}
                        color="#22c55e"
                        dimmed={pendingAdjustments.length === 0}
                      >
                        <CheckCircle2 size={14} />
                        Marcar cobrado
                      </ActionBtn>
                    </div>

                    {addOpen && (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input
                            value={addAmount}
                            onChange={(e) => setAddAmount(e.target.value)}
                            placeholder="Importe (ej: 2.50)"
                            inputMode="decimal"
                            style={inputStyle}
                          />
                          <input
                            value={addReason}
                            onChange={(e) => setAddReason(e.target.value)}
                            placeholder="Concepto (opcional)"
                            style={inputStyle}
                          />
                        </div>
                        <ActionBtn
                          onClick={() =>
                            startTransition(async () => {
                              const amt = Number(String(addAmount).replace(",", "."))
                              const res = await addPositiveAdjustmentAction(orderId, amt, addReason)
                              if (res?.error) { setError(res.error); return }
                              setAddAmount("")
                              setAddReason("")
                              setAddOpen(false)
                              await load()
                              onAfterMutate()
                            })
                          }
                          disabled={isPending}
                          color="#f97316"
                        >
                          <Plus size={14} />
                          Guardar cargo
                        </ActionBtn>
                      </div>
                    )}

                    {data.adjustments.length > 0 && (
                      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                        {data.adjustments.slice(0, 8).map((a) => (
                          <div
                            key={a.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              color: "#a8a29e",
                              fontSize: "0.82rem",
                            }}
                          >
                            <span>
                              <span
                                style={{
                                  color: a.status === "PENDING" ? "#f97316" : "#78716c",
                                  fontWeight: 700,
                                }}
                              >
                                {a.status === "PENDING" ? "Pendiente" : "Cobrado"}
                              </span>
                              {a.reason ? ` · ${a.reason}` : ""}
                            </span>
                            <span style={{ fontWeight: 800, color: a.status === "PENDING" ? "#f97316" : "#78716c" }}>
                              +{safeMoney(a.amount)}€
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                )}
              </div>

              {/* ── Right column: Items ── */}
              <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
                <Section title={`Artículos (${data.items.length})`}>
                  <div style={{ display: "grid", gap: 12 }}>
                    {data.items.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          paddingBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ fontWeight: 700, color: "#e7e5e4" }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: "rgba(249,115,22,0.12)",
                                color: "#f97316",
                                fontWeight: 800,
                                borderRadius: 6,
                                padding: "0 6px",
                                marginRight: 6,
                                fontSize: "0.85rem",
                              }}
                            >
                              ×{it.quantity}
                            </span>
                            {it.productNameSnapshot}
                          </div>
                          <div style={{ color: "#a8a29e", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {safeMoney(it.unitPrice)}€
                          </div>
                        </div>
                        {it.modifiers.length > 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              paddingLeft: 8,
                              borderLeft: "2px solid rgba(249,115,22,0.2)",
                              display: "grid",
                              gap: 4,
                            }}
                          >
                            {it.modifiers.map((m) => (
                              <div
                                key={m.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  color: "#a8a29e",
                                  fontSize: "0.82rem",
                                }}
                              >
                                <span>+ {m.modifierNameSnapshot}</span>
                                <span>{safeMoney(m.price)}€</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {it.notes && (
                          <div
                            style={{
                              marginTop: 6,
                              color: "#d6d3d1",
                              fontSize: "0.82rem",
                              fontStyle: "italic",
                            }}
                          >
                            📝 {it.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            </div>
          )}
        </div>

        {/* ─── FOOTER / ACTIONS ─── */}
        {!loading && data && (
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.5rem",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <div>
              {error && (
                <div style={{ color: "#fecaca", fontSize: "0.85rem" }}>{error}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {/* Cancelar — solo si no está en estado final */}
              {!isOrderFinal && (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await markAsCancelledAction(orderId)
                      if (res?.error) { setError(res.error); return }
                      onAfterMutate()
                      onClose()
                    })
                  }
                  disabled={isPending}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#fca5a5",
                    padding: "0.6rem 1rem",
                    borderRadius: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    opacity: isPending ? 0.6 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <Ban size={15} />
                  Cancelar pedido
                </button>
              )}

              {/* Avanzar — botón contextual según el estado */}
              {!isOrderFinal && advanceAction && (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      if (!data) return
                      const res = await advanceOrderStatusAction(orderId, data.status)
                      if (res?.error) { setError(res.error); return }
                      await load()
                      onAfterMutate()
                    })
                  }
                  disabled={isPending}
                  style={{
                    background: advanceAction.bg,
                    border: `1px solid ${advanceAction.borderColor}`,
                    color: advanceAction.color,
                    padding: "0.6rem 1.25rem",
                    borderRadius: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    opacity: isPending ? 0.6 : 1,
                    transition: "all 0.15s",
                  }}
                  title={advanceAction.label}
                >
                  {advanceAction.icon}
                  {advanceAction.label}
                </button>
              )}

              {/* Finalizar entrega directa — solo en estado DELIVERING */}
              {!isOrderFinal && data.status === "READY" && !data.isDelivery && (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await markAsDeliveredAction(orderId)
                      if (res?.error) { setError(res.error); return }
                      onAfterMutate()
                      onClose()
                    })
                  }
                  disabled={isPending}
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: "#22c55e",
                    padding: "0.6rem 1.25rem",
                    borderRadius: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  <CheckCircle2 size={15} />
                  Entregado
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Small helpers ───────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#fafaf9",
  fontSize: "0.875rem",
  width: "100%",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "0.9rem 1rem",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10, fontSize: "0.8rem", color: "#78716c", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string
  value: string
  bold?: boolean
  valueColor?: string
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 900 : 600, color: valueColor }}>{value}</span>
    </div>
  )
}

function ActionBtn({
  onClick,
  disabled,
  color = "#d6d3d1",
  dimmed,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  color?: string
  dimmed?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: dimmed ? "#78716c" : color,
        padding: "0.4rem 0.7rem",
        borderRadius: 10,
        cursor: disabled || dimmed ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "0.8rem",
        opacity: disabled ? 0.6 : 1,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
}
