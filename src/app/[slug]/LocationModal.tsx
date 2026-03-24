"use client"

import React, { useEffect, useState } from "react"
import { MapPin, Bike, Store, X, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

type AvailabilityResult = {
  isOpenNow: boolean
  isHoliday: boolean
  todayHours: {
    openTime: string
    closeTime: string
    isClosed: boolean
  } | null
  delivery: {
    enabled: boolean
    available: boolean
    openNow: boolean
    fee: number
    minOrder: number
    allowUnderMinOrder: boolean
    underMinFee: number
    estimatedMin: number
    estimatedMax: number
  }
  pickup: {
    enabled: boolean
    available: boolean
  }
  acceptFutureOrders: boolean
}

const SESSION_KEY = "zapieat.location"
const SESSION_KEY_LEGACY = "zasfood.location"

export type LocationChoice = {
  type: "delivery" | "pickup"
  postalCode?: string
  deliveryFee?: number
  minOrder?: number
  allowUnderMinOrder?: boolean
  underMinFee?: number
  estimatedMin?: number
  estimatedMax?: number
  isTable?: boolean
  tableId?: string
  tableName?: string
}

export function LocationModal({
  restaurantSlug,
  restaurantName,
  onConfirm,
}: {
  restaurantSlug: string
  restaurantName: string
  onConfirm: (choice: LocationChoice) => void
}) {
  const [postalCode, setPostalCode] = useState("")
  const [checking, setChecking] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial availability (without postal code) on mount
  useEffect(() => {
    fetch(`/api/storefront/${restaurantSlug}/availability`)
      .then((r) => r.json())
      .then((data) => setAvailability(data))
      .catch(console.error)
  }, [restaurantSlug])

  async function checkPostalCode() {
    const cp = postalCode.trim()
    if (!cp) return
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(`/api/storefront/${restaurantSlug}/availability?postalCode=${encodeURIComponent(cp)}`)
      const data: AvailabilityResult = await res.json()
      setAvailability(data)
      setShowDetails(true)
    } catch {
      setError("No se pudo verificar. Inténtalo de nuevo.")
    } finally {
      setChecking(false)
    }
  }

  function chooseDelivery() {
    if (!availability?.delivery.available) return
    const choice: LocationChoice = {
      type: "delivery",
      postalCode: postalCode.trim(),
      deliveryFee: availability.delivery.fee,
      minOrder: availability.delivery.minOrder,
      allowUnderMinOrder: availability.delivery.allowUnderMinOrder,
      underMinFee: availability.delivery.underMinFee,
      estimatedMin: availability.delivery.estimatedMin,
      estimatedMax: availability.delivery.estimatedMax,
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(choice))
    onConfirm(choice)
  }

  function choosePickup() {
    const choice: LocationChoice = { type: "pickup" }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(choice))
    onConfirm(choice)
  }

  const isRestaurantOpen = availability?.isOpenNow ?? true
  const deliveryEnabled = availability?.delivery.enabled ?? false
  const pickupEnabled = availability?.pickup.enabled ?? true

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.25rem",
      backdropFilter: "blur(6px)",
    }}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "#111110",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.05) 100%)",
          padding: "1.5rem",
          textAlign: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            display: "inline-flex", width: 56, height: 56,
            background: "rgba(249,115,22,0.12)",
            borderRadius: "50%",
            alignItems: "center", justifyContent: "center",
            marginBottom: "0.75rem",
          }}>
            <MapPin size={26} color="#f97316" />
          </div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>¿Cómo prefieres recibir tu pedido?</h2>
          <p style={{ color: "#a8a29e", fontSize: "0.875rem", margin: "0.4rem 0 0" }}>{restaurantName}</p>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* Closed warning */}
          {availability && !isRestaurantOpen && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "0.6rem",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12, padding: "0.75rem", marginBottom: "1rem",
            }}>
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, color: "#fca5a5", fontSize: "0.875rem" }}>
                  {availability.isHoliday ? "Hoy estamos cerrados por vacaciones" : "Ahora mismo estamos cerrados"}
                </div>
                {availability.todayHours && !availability.todayHours.isClosed && (
                  <div style={{ color: "#a8a29e", fontSize: "0.8rem", marginTop: 2 }}>
                    Horario hoy: {availability.todayHours.openTime} – {availability.todayHours.closeTime}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery section */}
          {deliveryEnabled && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Reparto a domicilio
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  style={{
                    flex: 1, padding: "0.6rem 0.9rem",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, color: "#fafaf9", fontSize: "0.9rem",
                  }}
                  placeholder="Código postal (ej: 28001)"
                  value={postalCode}
                  onChange={(e) => { setPostalCode(e.target.value); setShowDetails(false) }}
                  onKeyDown={(e) => e.key === "Enter" && checkPostalCode()}
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={checkPostalCode}
                  disabled={checking || !postalCode.trim()}
                  style={{
                    background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)",
                    color: "#f97316", padding: "0.6rem 0.9rem", borderRadius: 10,
                    cursor: checking || !postalCode.trim() ? "not-allowed" : "pointer",
                    fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                    opacity: !postalCode.trim() ? 0.5 : 1,
                  }}
                >
                  {checking ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Verificar"}
                </button>
              </div>

              {error && (
                <div style={{ color: "#f87171", fontSize: "0.8rem", marginTop: 6 }}>{error}</div>
              )}

              {/* Delivery result */}
              {showDetails && availability && (
                <div style={{ marginTop: "0.75rem" }}>
                  {availability.delivery.available ? (
                    <div style={{
                      background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
                      borderRadius: 12, padding: "0.9rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <CheckCircle2 size={16} color="#22c55e" />
                        <span style={{ fontWeight: 700, color: "#22c55e", fontSize: "0.875rem" }}>
                          ¡Repartimos a tu zona!
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "1.5rem", color: "#a8a29e", fontSize: "0.8rem" }}>
                        <span>🚚 Envío: <b style={{ color: "#fafaf9" }}>{availability.delivery.fee === 0 ? "Gratis" : `${availability.delivery.fee.toFixed(2)}€`}</b></span>
                        <span>⏱️ Tiempo: <b style={{ color: "#fafaf9" }}>{availability.delivery.estimatedMin}–{availability.delivery.estimatedMax} min</b></span>
                        {availability.delivery.minOrder > 0 && (
                          <span>📦 Mínimo: <b style={{ color: "#fafaf9" }}>{availability.delivery.minOrder.toFixed(2)}€</b></span>
                        )}
                      </div>
                      <button
                        onClick={chooseDelivery}
                        disabled={!isRestaurantOpen}
                        style={{
                          marginTop: "0.9rem", width: "100%",
                          background: isRestaurantOpen ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isRestaurantOpen ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.08)"}`,
                          color: isRestaurantOpen ? "#22c55e" : "#57534e",
                          padding: "0.7rem", borderRadius: 12,
                          fontWeight: 700, fontSize: "0.9rem",
                          cursor: isRestaurantOpen ? "pointer" : "not-allowed",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                        }}
                      >
                        <Bike size={16} />
                        {isRestaurantOpen ? "Pedir con reparto" : "Cerrado ahora"}
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
                      borderRadius: 12, padding: "0.9rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={16} color="#f87171" />
                        <span style={{ color: "#fca5a5", fontSize: "0.875rem", fontWeight: 600 }}>
                          No repartimos en ese código postal
                        </span>
                      </div>
                      <p style={{ color: "#78716c", fontSize: "0.8rem", margin: "0.4rem 0 0" }}>
                        Puedes recoger tu pedido en el local.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {deliveryEnabled && pickupEnabled && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ color: "#57534e", fontSize: "0.75rem" }}>o también puedes</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
          )}

          {/* Pickup button */}
          {pickupEnabled && (
            <button
              onClick={choosePickup}
              disabled={!isRestaurantOpen}
              style={{
                width: "100%",
                background: isRestaurantOpen ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isRestaurantOpen ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.06)"}`,
                color: isRestaurantOpen ? "#f97316" : "#57534e",
                padding: "0.85rem", borderRadius: 12,
                fontWeight: 700, fontSize: "0.9rem",
                cursor: isRestaurantOpen ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                transition: "all 0.15s",
              }}
            >
              <Store size={18} />
              Recoger en el local
              {availability?.todayHours && !availability.todayHours.isClosed && (
                <span style={{ fontSize: "0.75rem", fontWeight: 400, opacity: 0.7 }}>
                  · Hasta las {availability.todayHours.closeTime}
                </span>
              )}
            </button>
          )}

          {/* Open hours info */}
          {availability?.todayHours && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.9rem", justifyContent: "center" }}>
              <Clock size={13} color="#57534e" />
              <span style={{ fontSize: "0.77rem", color: "#57534e" }}>
                {availability.todayHours.isClosed
                  ? "Cerrado hoy"
                  : `Hoy: ${availability.todayHours.openTime} – ${availability.todayHours.closeTime}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// Hook to manage location session state
export function useLocationChoice(restaurantSlug: string): {
  choice: LocationChoice | null
  showModal: boolean
  setChoice: (c: LocationChoice) => void
  resetChoice: () => void
} {
  const [choice, setChoiceState] = useState<LocationChoice | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY_LEGACY)
    if (stored) {
      try {
        setChoiceState(JSON.parse(stored))
        setShowModal(false)
      } catch {
        setShowModal(true)
      }
    } else {
      setShowModal(true)
    }
  }, [restaurantSlug])

  function setChoice(c: LocationChoice) {
    setChoiceState(c)
    setShowModal(false)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(c))
  }

  function resetChoice() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY_LEGACY)
    setChoiceState(null)
    setShowModal(true)
  }

  return { choice, showModal, setChoice, resetChoice }
}
