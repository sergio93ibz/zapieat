"use client"

import React, { useState, useEffect, useTransition } from "react"
import {
  Clock, Truck, Calendar, Store, Save, Plus, X, ToggleLeft, ToggleRight,
  CheckCircle2, AlertCircle
} from "lucide-react"

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

type HourRow = {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
  deliveryOpenTime: string
  deliveryCloseTime: string
  deliveryEnabled: boolean
}

type DeliveryConfig = {
  timezone: string
  deliveryEnabled: boolean
  pickupEnabled: boolean
  deliveryPostalCodes: string[]
  deliveryFee: number
  minOrderAmount: number
  allowUnderMinOrder: boolean
  underMinFee: number
  estimatedMinMinutes: number
  estimatedMaxMinutes: number
  acceptFutureOrders: boolean
  maxDaysInAdvance: number
  isManuallyOpen: boolean
}

type Holiday = { id: string; date: string; reason?: string }
type HolidayToAdd = { date: string; reason?: string }

const defaultHour = (day: number): HourRow => ({
  dayOfWeek: day,
  openTime: "09:00",
  closeTime: "22:00",
  isClosed: day === 0, // Sunday closed by default
  deliveryOpenTime: "10:00",
  deliveryCloseTime: "22:00",
  deliveryEnabled: true,
})

const inputCls: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#fafaf9",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
        <div style={{ color: "#f97316" }}>{icon}</div>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          background: "transparent", border: "none", cursor: "pointer", color: checked ? "#22c55e" : "#78716c", flexShrink: 0,
        }}
      >
        {checked ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
      <span style={{ color: "#d6d3d1", fontSize: "0.875rem" }}>{label}</span>
    </label>
  )
}

export function DeliverySettingsForm() {
  const [tab, setTab] = useState<"hours" | "delivery" | "holidays">("hours")
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const [hours, setHours] = useState<HourRow[]>(Array.from({ length: 7 }, (_, i) => defaultHour(i)))
  const [delivery, setDelivery] = useState<DeliveryConfig>({
    timezone: "Europe/Madrid",
    deliveryEnabled: true,
    pickupEnabled: true,
    deliveryPostalCodes: [],
    deliveryFee: 0,
    minOrderAmount: 0,
    allowUnderMinOrder: false,
    underMinFee: 0,
    estimatedMinMinutes: 30,
    estimatedMaxMinutes: 60,
    acceptFutureOrders: false,
    maxDaysInAdvance: 0,
    isManuallyOpen: true,
  })
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [newCp, setNewCp] = useState("")
  const [newHolidayDate, setNewHolidayDate] = useState("")
  const [newHolidayReason, setNewHolidayReason] = useState("")
  const [holidaysToAdd, setHolidaysToAdd] = useState<HolidayToAdd[]>([])
  const [holidaysToRemove, setHolidaysToRemove] = useState<string[]>([])

  // Load data
  useEffect(() => {
    fetch("/api/dashboard/delivery-settings")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body?.error || `Error cargando (${r.status})`)
        }
        return r.json()
      })
      .then(({ settings, openingHours, holidays: h }) => {
        if (openingHours?.length) {
          setHours(
            Array.from({ length: 7 }, (_, i) => {
              const existing = openingHours.find((oh: any) => oh.dayOfWeek === i)
              return existing
                ? {
                    dayOfWeek: i,
                    openTime: existing.openTime,
                    closeTime: existing.closeTime,
                    isClosed: existing.isClosed,
                    deliveryOpenTime: existing.deliveryOpenTime ?? existing.openTime,
                    deliveryCloseTime: existing.deliveryCloseTime ?? existing.closeTime,
                    deliveryEnabled: existing.deliveryEnabled ?? true,
                  }
                : defaultHour(i)
            })
          )
        }
        if (settings) {
          setDelivery({
            timezone: settings.timezone ?? "Europe/Madrid",
            deliveryEnabled: settings.deliveryEnabled,
            pickupEnabled: settings.pickupEnabled,
            deliveryPostalCodes: settings.deliveryPostalCodes ?? [],
            deliveryFee: Number(settings.deliveryFee),
            minOrderAmount: Number(settings.minOrderAmount),
            allowUnderMinOrder: settings.allowUnderMinOrder ?? false,
            underMinFee: Number(settings.underMinFee ?? 0),
            estimatedMinMinutes: settings.estimatedMinMinutes,
            estimatedMaxMinutes: settings.estimatedMaxMinutes,
            acceptFutureOrders: settings.acceptFutureOrders,
            maxDaysInAdvance: settings.maxDaysInAdvance,
            isManuallyOpen: settings.isManuallyOpen,
          })
        }
        if (h) {
          setHolidays(h.map((hd: any) => ({ id: hd.id, date: hd.date.slice(0, 10), reason: hd.reason })))
        }
      })
      .catch((err) => {
        console.error(err)
        setStatus({ type: "error", msg: "No se pudo cargar la configuracion de envio/horarios." })
      })
  }, [])

  function updateHour(day: number, field: keyof HourRow, value: any) {
    setHours((prev) => prev.map((h) => h.dayOfWeek === day ? { ...h, [field]: value } : h))
  }

  function addCp() {
    const cp = newCp.trim()
    if (!cp || delivery.deliveryPostalCodes.includes(cp)) return
    setDelivery((d) => ({ ...d, deliveryPostalCodes: [...d.deliveryPostalCodes, cp] }))
    setNewCp("")
  }

  function removeCp(cp: string) {
    setDelivery((d) => ({ ...d, deliveryPostalCodes: d.deliveryPostalCodes.filter((c) => c !== cp) }))
  }

  function addHoliday() {
    if (!newHolidayDate) return
    const dateKey = newHolidayDate
    if (holidays.find((h) => h.date === dateKey)) return
    setHolidays((prev) => [...prev, { id: "new_" + dateKey, date: dateKey, reason: newHolidayReason }])
    setHolidaysToAdd((prev) => [...prev, { date: dateKey, reason: newHolidayReason || undefined }])
    setNewHolidayDate("")
    setNewHolidayReason("")
  }

  function removeHoliday(dateKey: string) {
    setHolidays((prev) => prev.filter((h) => h.date !== dateKey))

    setHolidaysToAdd((prev) => {
      const wasNew = prev.some((h) => h.date === dateKey)
      if (!wasNew) return prev
      return prev.filter((h) => h.date !== dateKey)
    })

    setHolidaysToRemove((prev) => {
      // Only mark removal if it wasn't added in this session
      const isNew = holidaysToAdd.some((h) => h.date === dateKey)
      if (isNew) return prev
      if (prev.includes(dateKey)) return prev
      return [...prev, dateKey]
    })
  }

  function save() {
    startTransition(async () => {
      setStatus(null)
      try {
        const res = await fetch("/api/dashboard/delivery-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...delivery,
            openingHours: hours,
            holidaysToAdd,
            holidaysToRemove,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const msg = body?.details || body?.error || `Error al guardar (${res.status})`
          throw new Error(msg)
        }
        setStatus({ type: "success", msg: "Configuración guardada correctamente." })
        setHolidaysToAdd([])
        setHolidaysToRemove([])
        setTimeout(() => setStatus(null), 3000)
      } catch (e: any) {
        setStatus({ type: "error", msg: e?.message || "No se pudo guardar la configuración." })
      }
    })
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.6rem 1.1rem",
    borderRadius: 10,
    border: active ? "1px solid rgba(249,115,22,0.35)" : "1px solid transparent",
    background: active ? "rgba(249,115,22,0.08)" : "transparent",
    color: active ? "#f97316" : "#a8a29e",
    cursor: "pointer",
    fontWeight: active ? 700 : 400,
    fontSize: "0.875rem",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    transition: "all 0.15s",
  })

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        <button type="button" style={tabStyle(tab === "hours")} onClick={() => setTab("hours")}>
          <Clock size={15} /> Horarios
        </button>
        <button type="button" style={tabStyle(tab === "delivery")} onClick={() => setTab("delivery")}>
          <Truck size={15} /> Reparto y Recogida
        </button>
        <button type="button" style={tabStyle(tab === "holidays")} onClick={() => setTab("holidays")}>
          <Calendar size={15} /> Vacaciones / Cierres
        </button>
      </div>

      {/* Status */}
      {status && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.75rem 1rem", borderRadius: 12, marginBottom: "1.25rem",
          background: status.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${status.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          color: status.type === "success" ? "#22c55e" : "#fca5a5",
          fontSize: "0.875rem",
        }}>
          {status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {status.msg}
        </div>
      )}

      {/* ─── TAB: HORARIOS ─── */}
      {tab === "hours" && (
        <>
          {/* Manual open/close toggle + Timezone */}
          <SectionCard title="Estado del Negocio" icon={<Store size={18} />}>
            <Toggle
              checked={delivery.isManuallyOpen}
              onChange={(v) => setDelivery((d) => ({ ...d, isManuallyOpen: v }))}
              label={delivery.isManuallyOpen ? "🟢 Abierto (los horarios controlan el acceso)" : "🔴 Cerrado manualmente (bloquea todos los pedidos)"}
            />
            <div style={{ marginTop: "1rem", display: "grid", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🌍 Zona horaria del negocio
              </label>
              <select
                value={delivery.timezone}
                onChange={(e) => setDelivery((d) => ({ ...d, timezone: e.target.value }))}
                style={{
                  ...inputCls,
                  maxWidth: 320,
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <optgroup label="España">
                  <option value="Europe/Madrid">Europe/Madrid (Península y Baleares)</option>
                  <option value="Atlantic/Canary">Atlantic/Canary (Canarias)</option>
                </optgroup>
                <optgroup label="Europa">
                  <option value="Europe/London">Europe/London (UK)</option>
                  <option value="Europe/Paris">Europe/Paris (Francia)</option>
                  <option value="Europe/Berlin">Europe/Berlin (Alemania)</option>
                  <option value="Europe/Rome">Europe/Rome (Italia)</option>
                  <option value="Europe/Lisbon">Europe/Lisbon (Portugal)</option>
                  <option value="Europe/Amsterdam">Europe/Amsterdam (Holanda)</option>
                  <option value="Europe/Brussels">Europe/Brussels (Bélgica)</option>
                  <option value="Europe/Zurich">Europe/Zurich (Suiza)</option>
                </optgroup>
                <optgroup label="América">
                  <option value="America/New_York">America/New_York (Este EEUU)</option>
                  <option value="America/Chicago">America/Chicago (Centro EEUU)</option>
                  <option value="America/Denver">America/Denver (Montaña EEUU)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (Pacífico EEUU)</option>
                  <option value="America/Mexico_City">America/Mexico_City (México)</option>
                  <option value="America/Bogota">America/Bogota (Colombia)</option>
                  <option value="America/Lima">America/Lima (Perú)</option>
                  <option value="America/Santiago">America/Santiago (Chile)</option>
                  <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (Argentina)</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (Brasil)</option>
                </optgroup>
                <optgroup label="UTC">
                  <option value="UTC">UTC (Coordinado Universal)</option>
                </optgroup>
              </select>
              <p style={{ fontSize: "0.75rem", color: "#57534e", margin: 0 }}>
                Los horarios de apertura y reparto se interpretan en esta zona horaria.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Horario Semanal" icon={<Clock size={18} />}>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {hours.map((h) => (
                <div key={h.dayOfWeek} style={{
                  display: "grid", gridTemplateColumns: "90px 1fr", gap: "0.75rem",
                  alignItems: "start", padding: "0.75rem",
                  background: h.isClosed ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12,
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: 4 }}>{DAY_NAMES[h.dayOfWeek]}</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={h.isClosed} onChange={(e) => updateHour(h.dayOfWeek, "isClosed", e.target.checked)} />
                      <span style={{ fontSize: "0.75rem", color: "#a8a29e" }}>Cerrado</span>
                    </label>
                  </div>
                  {!h.isClosed && (
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.4rem", alignItems: "center" }}>
                        <input type="time" value={h.openTime} onChange={(e) => updateHour(h.dayOfWeek, "openTime", e.target.value)} style={inputCls} />
                        <span style={{ color: "#57534e", fontSize: "0.8rem" }}>a</span>
                        <input type="time" value={h.closeTime} onChange={(e) => updateHour(h.dayOfWeek, "closeTime", e.target.value)} style={inputCls} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="checkbox" id={`del-${h.dayOfWeek}`} checked={h.deliveryEnabled} onChange={(e) => updateHour(h.dayOfWeek, "deliveryEnabled", e.target.checked)} />
                        <label htmlFor={`del-${h.dayOfWeek}`} style={{ fontSize: "0.75rem", color: "#a8a29e" }}>Horario de reparto diferente</label>
                      </div>
                      {h.deliveryEnabled && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.4rem", alignItems: "center", paddingLeft: "0.5rem", borderLeft: "2px solid rgba(249,115,22,0.2)" }}>
                          <input type="time" value={h.deliveryOpenTime} onChange={(e) => updateHour(h.dayOfWeek, "deliveryOpenTime", e.target.value)} style={inputCls} />
                          <span style={{ color: "#57534e", fontSize: "0.8rem" }}>a</span>
                          <input type="time" value={h.deliveryCloseTime} onChange={(e) => updateHour(h.dayOfWeek, "deliveryCloseTime", e.target.value)} style={inputCls} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      {/* ─── TAB: REPARTO ─── */}
      {tab === "delivery" && (
        <>
          <SectionCard title="Opciones de Servicio" icon={<Truck size={18} />}>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <Toggle checked={delivery.deliveryEnabled} onChange={(v) => setDelivery((d) => ({ ...d, deliveryEnabled: v }))} label="Reparto a domicilio activo" />
              <Toggle checked={delivery.pickupEnabled} onChange={(v) => setDelivery((d) => ({ ...d, pickupEnabled: v }))} label="Recogida en local activa" />
            </div>
          </SectionCard>

          {delivery.deliveryEnabled && (
            <>
              <SectionCard title="Códigos Postales con Reparto" icon={<Truck size={18} />}>
                <p style={{ color: "#78716c", fontSize: "0.8rem", marginBottom: "1rem", marginTop: 0 }}>
                  Si dejas la lista vacía, el reparto estará disponible para cualquier dirección.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <input
                    style={{ ...inputCls, flex: 1 }}
                    placeholder="Ej: 28001"
                    value={newCp}
                    onChange={(e) => setNewCp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCp())}
                    maxLength={10}
                  />
                  <button type="button" onClick={addCp} style={{
                    background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)",
                    color: "#f97316", padding: "0.5rem 0.75rem", borderRadius: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Plus size={16} /> Añadir
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {delivery.deliveryPostalCodes.length === 0 && (
                    <span style={{ color: "#78716c", fontSize: "0.8rem" }}>Sin restricción de código postal</span>
                  )}
                  {delivery.deliveryPostalCodes.map((cp) => (
                    <span key={cp} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
                      color: "#f97316", padding: "0.25rem 0.6rem", borderRadius: 8, fontSize: "0.8rem",
                    }}>
                      {cp}
                      <button type="button" onClick={() => removeCp(cp)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f97316", padding: 0, display: "flex" }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Tarifas y Tiempos" icon={<Truck size={18} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <label style={{ display: "grid", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tarifa de envío (€)</span>
                    <input
                      type="number" min="0" step="0.5" style={inputCls}
                      value={delivery.deliveryFee}
                      onChange={(e) => setDelivery((d) => ({ ...d, deliveryFee: Number(e.target.value) }))}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pedido mínimo (€)</span>
                    <input
                      type="number" min="0" step="0.5" style={inputCls}
                      value={delivery.minOrderAmount}
                      onChange={(e) => setDelivery((d) => ({ ...d, minOrderAmount: Number(e.target.value) }))}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tiempo mínimo estimado (min)</span>
                    <input
                      type="number" min="5" step="5" style={inputCls}
                      value={delivery.estimatedMinMinutes}
                      onChange={(e) => setDelivery((d) => ({ ...d, estimatedMinMinutes: Number(e.target.value) }))}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tiempo máximo estimado (min)</span>
                    <input
                      type="number" min="5" step="5" style={inputCls}
                      value={delivery.estimatedMaxMinutes}
                      onChange={(e) => setDelivery((d) => ({ ...d, estimatedMaxMinutes: Number(e.target.value) }))}
                    />
                  </label>
                </div>
                {delivery.minOrderAmount > 0 && (
                  <div style={{ marginTop: "1.25rem", padding: "1rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                    <Toggle
                      checked={delivery.allowUnderMinOrder}
                      onChange={(v) => setDelivery((d) => ({ ...d, allowUnderMinOrder: v }))}
                      label="Permitir pedidos por debajo del mínimo pagando la tarifa de envío"
                    />
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", color: "#78716c", marginLeft: "2.5rem" }}>
                      Si está desactivado, no se permitirá completar pedidos que no superen los {delivery.minOrderAmount}€. Si se activa, se les permitirá comprar si pagan un suplemento de entrega adicional.
                    </p>
                    {delivery.allowUnderMinOrder && (
                      <div style={{ marginLeft: "2.5rem", marginTop: "1rem" }}>
                        <label style={{ display: "grid", gap: "0.35rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Suplemento a pagar (€) por no llegar al mínimo
                          </span>
                          <input
                            type="number" min="0" step="0.5" style={{ ...inputCls, maxWidth: "150px" }}
                            value={delivery.underMinFee}
                            onChange={(e) => setDelivery((d) => ({ ...d, underMinFee: Number(e.target.value) }))}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          <SectionCard title="Pedidos Anticipados" icon={<Calendar size={18} />}>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <Toggle
                checked={delivery.acceptFutureOrders}
                onChange={(v) => setDelivery((d) => ({ ...d, acceptFutureOrders: v }))}
                label="Aceptar pedidos para días futuros"
              />
              {delivery.acceptFutureOrders && (
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#a8a29e", fontWeight: 600, textTransform: "uppercase" }}>Máximo de días con antelación</span>
                  <input
                    type="number" min="1" max="30" style={{ ...inputCls, maxWidth: 120 }}
                    value={delivery.maxDaysInAdvance}
                    onChange={(e) => setDelivery((d) => ({ ...d, maxDaysInAdvance: Number(e.target.value) }))}
                  />
                </label>
              )}
            </div>
          </SectionCard>
        </>
      )}

      {/* ─── TAB: VACACIONES ─── */}
      {tab === "holidays" && (
        <SectionCard title="Días de Cierre / Vacaciones" icon={<Calendar size={18} />}>
          <p style={{ color: "#78716c", fontSize: "0.8rem", marginBottom: "1.25rem", marginTop: 0 }}>
            Los días marcados como cierre no aceptarán pedidos, independientemente del horario.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", marginBottom: "1rem", alignItems: "end" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#a8a29e", marginBottom: 4 }}>Fecha</div>
              <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} style={inputCls} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#a8a29e", marginBottom: 4 }}>Motivo (opcional)</div>
              <input placeholder="Ej: Vacaciones de agosto" value={newHolidayReason} onChange={(e) => setNewHolidayReason(e.target.value)} style={inputCls} />
            </div>
            <button type="button" onClick={addHoliday} style={{
              background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)",
              color: "#f97316", padding: "0.5rem 0.75rem", borderRadius: 10, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Plus size={16} /> Añadir
            </button>
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {holidays.length === 0 && (
              <div style={{ color: "#57534e", fontSize: "0.875rem", textAlign: "center", padding: "1rem" }}>No hay días de cierre configurados.</div>
            )}
            {holidays.map((h) => (
              <div key={h.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.65rem 0.9rem", background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10,
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#fca5a5" }}>{h.date}</span>
                  {h.reason && <span style={{ color: "#78716c", marginLeft: 10, fontSize: "0.8rem" }}>{h.reason}</span>}
                </div>
                <button type="button" onClick={() => removeHoliday(h.date)} style={{
                  background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, display: "flex",
                }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)",
            color: "#f97316", padding: "0.65rem 1.5rem", borderRadius: 12,
            fontWeight: 700, fontSize: "0.9rem", cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1, transition: "all 0.15s",
          }}
        >
          <Save size={16} />
          {isPending ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>
    </div>
  )
}
