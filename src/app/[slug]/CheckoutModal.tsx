"use client"

import React, { useState, useEffect, useRef } from "react"
import { ShoppingBag, X, User, Phone, Mail, MapPin, CreditCard, Banknote, ChevronDown, AlertTriangle, CheckCircle2, Lock, ArrowRight, Star } from "lucide-react"
import styles from "./storefront.module.css"
import { useCart } from "./CartContext"
import { Portal } from "@/components/ui/Portal"
import { useRouter } from "next/navigation"
import type { LocationChoice } from "./LocationModal"
import { requestCustomerOtpAction, verifyCustomerOtpAction } from "./customerActions"

interface CheckoutModalProps {
  restaurantId: string
  restaurantSlug: string
  locationChoice: LocationChoice | null
  onClose: () => void
  customer?: {
    name?: string | null
    email?: string | null
    phone?: string | null
    loyaltyPoints?: number
    savedAddresses?: Array<{ id: string; label: string; street: string; postalCode: string; city: string }> | null
  } | null
  loyaltySettings?: {
    enabled: boolean
    pointsValue: number
    minPoints: number
  }
}

export function CheckoutModal({ restaurantId, restaurantSlug, locationChoice, onClose, customer, loyaltySettings }: CheckoutModalProps) {
  const { items, total, clearCart } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isDeliveryMode = locationChoice?.type === "delivery" && !locationChoice?.isTable
  const isTableMode = !!locationChoice?.isTable
  const minOrder = isDeliveryMode ? (locationChoice?.minOrder ?? 0) : 0
  const belowMinimum = isDeliveryMode && minOrder > 0 && total < minOrder
  const baseDeliveryFee = isDeliveryMode ? (locationChoice?.deliveryFee ?? 0) : 0
  const underMinFee = isDeliveryMode ? (locationChoice?.underMinFee ?? 0) : 0
  const allowUnderMinOrder = isDeliveryMode ? (locationChoice?.allowUnderMinOrder ?? false) : false
  const hardBlock = belowMinimum && !allowUnderMinOrder
  const softWarn = belowMinimum && allowUnderMinOrder
  const deliveryFee = softWarn ? underMinFee : ((minOrder > 0 && !belowMinimum) ? 0 : baseDeliveryFee)
  const grandTotal = total + (isTableMode ? 0 : deliveryFee)

  const savedAddresses = (customer?.savedAddresses as any[]) || []
  const isLoggedIn = !!customer
  const skipLogin = isTableMode // Super fast for tables

  // ── Quick registration state (for non-logged users) ──
  const PREFIXES = ["+34","+52","+1","+44","+54","+57","+56"]
  const [regStep, setRegStep] = useState<"info" | "otp" | "done">(isLoggedIn || skipLogin ? "done" : "info")
  const [regPrefix, setRegPrefix] = useState("+34")
  const [regPhone, setRegPhone] = useState("")
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regOtp, setRegOtp] = useState("")
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState("")

  // ── Form state ──
  const [formData, setFormData] = useState({
    customerName: customer?.name || "",
    customerEmail: customer?.email || "",
    customerPhone: customer?.phone || "",
    deliveryAddress: "",
    postalCode: locationChoice?.postalCode || "",
    city: "",
    deliveryNotes: "",
    isDelivery: isDeliveryMode,
    paymentMethod: "CASH" as "CASH",
  })

  // ── Loyalty Points State ──
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false)
  const loyaltyPoints = customer?.loyaltyPoints || 0
  const loyaltyValue = loyaltySettings?.pointsValue || 0
  const minPointsToRedeem = loyaltySettings?.minPoints || 0
  const loyaltyEnabled = loyaltySettings?.enabled || false
  const canRedeemPoints = loyaltyEnabled && loyaltyPoints >= minPointsToRedeem
  const loyaltyDiscount = useLoyaltyPoints ? (loyaltyPoints * loyaltyValue) : 0

  // ── Coupon State ──
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, label: string, discountAmount: number, isFreeProduct: boolean, freeProductLabel?: string} | null>(null)

  // ── Postal code delivery validation state ──
  const [cpStatus, setCpStatus] = useState<"idle" | "checking" | "ok" | "no_service">("idle")
  const cpDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function checkPostalCode(cp: string) {
    if (!cp || cp.length < 4) { setCpStatus("idle"); return }
    // Skip if it's the same as locationChoice postalCode (already validated)
    if (locationChoice?.postalCode && cp === locationChoice.postalCode) { setCpStatus("ok"); return }
    setCpStatus("checking")
    try {
      const res = await fetch(`/api/storefront/${restaurantSlug}/availability?postalCode=${encodeURIComponent(cp)}`)
      const data = await res.json()
      setCpStatus(data.delivery?.available ? "ok" : "no_service")
    } catch {
      setCpStatus("idle")
    }
  }

  // ── Select saved address ──
  const handleSelectSavedAddress = (addressId: string) => {
    if (addressId === "_manual") {
      setFormData(prev => ({ ...prev, deliveryAddress: "", postalCode: locationChoice?.postalCode || "", city: "" }))
      setCpStatus(locationChoice?.postalCode ? "ok" : "idle")
      return
    }
    const addr = savedAddresses.find((a: any) => a.id === addressId)
    if (addr) {
      const cp = addr.postalCode || locationChoice?.postalCode || ""
      setFormData(prev => ({ ...prev, deliveryAddress: addr.street, postalCode: cp, city: addr.city }))
      checkPostalCode(cp)
    }
  }

  // ── Handle CP change manually ──
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === "postalCode") {
      if (cpDebounceRef.current) clearTimeout(cpDebounceRef.current)
      cpDebounceRef.current = setTimeout(() => checkPostalCode(value), 700)
    }
  }

  const handleToggleDelivery = (isDelivery: boolean) => {
    setFormData(prev => ({ ...prev, isDelivery }))
    setCpStatus("idle")
  }

  // ── Registration handlers ──
  async function handleRegisterSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!regName || !regPhone) return
    setRegError("")
    setRegLoading(true)
    const fullPhone = `${regPrefix}${regPhone}`
    const res = await requestCustomerOtpAction(restaurantId, fullPhone)
    setRegLoading(false)
    if (res.error) { setRegError(res.error); return }
    setRegStep("otp")
  }

  async function handleRegisterVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setRegError("")
    setRegLoading(true)
    const fullPhone = `${regPrefix}${regPhone}`
    const res = await verifyCustomerOtpAction(restaurantId, fullPhone, regOtp)
    setRegLoading(false)
    if (res.error) { setRegError(res.error); return }
    // Fill form data from registration
    setFormData(prev => ({ ...prev, customerName: regName, customerEmail: regEmail, customerPhone: fullPhone }))
    setRegStep("done")
  }

  // ── Coupon Validation ──
  const handleApplyCoupon = async () => {
     setCouponError("")
     setCouponLoading(true)
     try {
       const res = await fetch(`/api/storefront/${restaurantSlug}/coupons/validate`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ code: couponCode, cartSubtotal: total })
       });
       const data = await res.json();
       if (!data.valid) {
         setCouponError(data.message || "Cupón inválido");
         setCouponLoading(false);
         return;
       }
       // Process valid coupon
       const cp = data.coupon;
       let discountAmount = 0;
       let label = "";
       let isFreeProduct = false;
       let freeProductLabel = "";

       if (cp.discountType === "PERCENTAGE") {
          discountAmount = total * (cp.discountValue / 100);
          label = `-${cp.discountValue}% de descuento`;
       } else if (cp.discountType === "FIXED_AMOUNT") {
          discountAmount = cp.discountValue;
          if (discountAmount > total) discountAmount = total;
          label = `-${cp.discountValue}€ de descuento`;
       } else if (cp.discountType === "FREE_PRODUCT" && cp.freeProduct) {
          isFreeProduct = true;
          freeProductLabel = cp.freeProduct.name;
          label = `Regalo: ${cp.freeProduct.name}`;
       }

       setAppliedCoupon({
         code: cp.code,
         label,
         discountAmount,
         isFreeProduct,
         freeProductLabel
       });
       setCouponError("");
     } catch(e) {
       setCouponError("Error al verificar código.");
     }
     setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const finalGrandTotal = Math.max(0, grandTotal - (appliedCoupon?.discountAmount || 0) - loyaltyDiscount);

  // ── Submit order ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.isDelivery && cpStatus === "no_service") return
    setLoading(true)
    try {
      const response = await fetch(`/api/storefront/${restaurantSlug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName,
          ...(formData.customerEmail ? { customerEmail: formData.customerEmail } : {}),
          ...(formData.customerPhone ? { customerPhone: formData.customerPhone } : {}),
          deliveryAddress: isTableMode
            ? `Mesa ${locationChoice?.tableName || locationChoice?.tableId}`
            : (formData.isDelivery
              ? `${formData.deliveryAddress}, ${formData.postalCode}, ${formData.city}`
              : "Recogida en local"),
          deliveryNotes: formData.deliveryNotes,
          isDelivery: formData.isDelivery && !isTableMode,
          orderType: isTableMode ? "TABLE" : (formData.isDelivery ? "DELIVERY" : "PICKUP"),
          tableId: locationChoice?.tableId,
          paymentMethod: formData.paymentMethod,
          couponCode: appliedCoupon?.code,
          loyaltyPointsUsed: useLoyaltyPoints ? loyaltyPoints : 0,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            modifiers: item.options.map(opt => ({ modifierId: opt.modifierId }))
          }))
        })
      })
      if (!response.ok) throw new Error("Error al crear el pedido")
      const { order } = await response.json()
      clearCart()
      router.push(`/${restaurantSlug}/confirmation?orderId=${order.id}`)
    } catch (err) {
      console.error(err)
      alert("Hubo un error al procesar tu pedido. Inténtalo de nuevo.")
      setLoading(false)
    }
  }

  const cpBorder = cpStatus === "ok" ? "#22c55e" : cpStatus === "no_service" ? "#ef4444" : "#e2e8f0"
  const cpBg = cpStatus === "ok" ? "#f0fdf4" : cpStatus === "no_service" ? "#fef2f2" : "#f8fafc"

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '2rem', width: '95%', maxWidth: '900px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.5)'
        }} onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={18} color="#f97316" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Finalizar Pedido</h2>
            </div>
            <button className={styles.modalClose} onClick={onClose} style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}><X size={20} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* LEFT: Form */}
            <div style={{ flex: '1 1 450px', padding: '1.5rem', backgroundColor: '#ffffff' }}>

              {/* ── STEP 1: Quick Register (non-logged users) ── */}
              {regStep !== "done" && (
                <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.05), rgba(234,88,12,0.03))', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Lock size={18} color="#f97316" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                      {regStep === "info" ? "¡Identifícate para continuar!" : "Introduce el código SMS"}
                    </h3>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {regStep === "info"
                      ? "En desarrollo el código será 0000. Acumularás puntos y podrás ver tu historial."
                      : `Hemos enviado un código a ${regPrefix}${regPhone}. (Dev: 0000)`}
                  </p>

                  {regError && (
                    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
                      {regError}
                    </div>
                  )}

                  {regStep === "info" && (
                    <form onSubmit={handleRegisterSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input
                        value={regName} onChange={e => setRegName(e.target.value)} required
                        placeholder="Tu nombre completo"
                        style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none' }}
                      />
                      <input
                        value={regEmail} onChange={e => setRegEmail(e.target.value)}
                        type="email" placeholder="Email (opcional)"
                        style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          value={regPrefix} onChange={e => setRegPrefix(e.target.value)}
                          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', background: '#fff', cursor: 'pointer', outline: 'none' }}
                        >
                          {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                          value={regPhone} onChange={e => setRegPhone(e.target.value)} required
                          type="tel" placeholder="600123456"
                          style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none' }}
                        />
                      </div>
                      <button type="submit" disabled={regLoading}
                        style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.875rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        {regLoading ? "Enviando..." : <><ArrowRight size={16} /> Continuar y recibir código</>}
                      </button>
                    </form>
                  )}

                  {regStep === "otp" && (
                    <form onSubmit={handleRegisterVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input
                        value={regOtp} onChange={e => setRegOtp(e.target.value)} required maxLength={4}
                        placeholder="0 0 0 0"
                        style={{ padding: '1rem', borderRadius: '8px', border: '2px solid #f97316', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '8px', fontWeight: 800, outline: 'none' }}
                      />
                      <button type="submit" disabled={regLoading}
                        style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.875rem', fontWeight: 800, cursor: 'pointer' }}>
                        {regLoading ? "Verificando..." : "Verificar y continuar →"}
                      </button>
                      <button type="button" onClick={() => setRegStep("info")}
                        style={{ background: 'transparent', border: 'none', color: '#888', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                        Cambiar número
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ── STEP 2: Show form if not logged and done, or always if logged ── */}
              {regStep === "done" && (
                <form id="order-form" onSubmit={handleSubmit}>
                  {/* Delivery / Pickup toggle / Table Indicator */}
                  {!isTableMode ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div onClick={() => handleToggleDelivery(true)}
                        style={{ border: `1px solid ${formData.isDelivery ? '#f97316' : '#e2e8f0'}`, backgroundColor: formData.isDelivery ? 'rgba(249,115,22,0.05)' : '#fff', padding: '1rem', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={20} color={formData.isDelivery ? "#f97316" : "#94a3b8"} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: formData.isDelivery ? '#c2410c' : '#475569' }}>A domicilio</span>
                      </div>
                      <div onClick={() => handleToggleDelivery(false)}
                        style={{ border: `1px solid ${!formData.isDelivery ? '#f97316' : '#e2e8f0'}`, backgroundColor: !formData.isDelivery ? 'rgba(249,115,22,0.05)' : '#fff', padding: '1rem', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <ShoppingBag size={20} color={!formData.isDelivery ? "#f97316" : "#94a3b8"} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: !formData.isDelivery ? '#c2410c' : '#475569' }}>Recoger en local</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 size={24} color="#22c55e" />
                      <div>
                        <div style={{ fontWeight: 800, color: '#15803d' }}>Pidiendo desde Mesa {locationChoice?.tableName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#16a34a' }}>Tu pedido se servirá directamente en tu mesa.</div>
                      </div>
                    </div>
                  )}

                  {/* Name */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Nombre Completo</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input type="text" name="customerName" required value={formData.customerName} onChange={handleChange}
                        placeholder="Tu nombre completo"
                        style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '0.95rem' }} />
                    </div>
                  </div>

                  {/* Email + Phone (Hidden for Tables) */}
                  {!isTableMode && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange}
                            placeholder="tu@email.com"
                            style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '0.95rem' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Teléfono</label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          <input type="tel" name="customerPhone" required={!isTableMode} value={formData.customerPhone} onChange={handleChange}
                            placeholder="+34 600 000 000"
                            style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '0.95rem' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address (delivery only) */}
                  {formData.isDelivery && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Dirección de Entrega</label>

                      {savedAddresses.length > 0 && (
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                          <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                          <select onChange={e => handleSelectSavedAddress(e.target.value)} defaultValue=""
                            style={{ width: '100%', padding: '0.875rem 2.5rem 0.875rem 1rem', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#0f172a', fontSize: '0.95rem', appearance: 'none', cursor: 'pointer' }}>
                            <option value="" disabled>Elegir dirección guardada...</option>
                            {savedAddresses.map((addr: any) => (
                              <option key={addr.id} value={addr.id}>{addr.label} — {addr.street}, {addr.postalCode} {addr.city}</option>
                            ))}
                            <option value="_manual">Introducir dirección manual</option>
                          </select>
                        </div>
                      )}

                      <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input type="text" name="deliveryAddress" required={formData.isDelivery} value={formData.deliveryAddress} onChange={handleChange}
                          placeholder="Calle, número, piso, puerta..."
                          style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '0.95rem' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        {/* CP with live validation */}
                        <div style={{ position: 'relative' }}>
                          <input type="text" name="postalCode" required={formData.isDelivery} value={formData.postalCode} onChange={handleChange}
                            readOnly={!!locationChoice?.postalCode}
                            placeholder="C.P."
                            style={{ width: '100%', padding: '0.875rem 2.5rem 0.875rem 1rem', borderRadius: '10px', backgroundColor: cpBg, border: `2px solid ${cpBorder}`, color: '#0f172a', fontSize: '0.95rem', cursor: locationChoice?.postalCode ? 'not-allowed' : 'text', transition: 'border-color 0.3s, background 0.3s' }} />
                          <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                            {cpStatus === "checking" && <div style={{ width: 14, height: 14, border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                            {cpStatus === "ok" && <CheckCircle2 size={16} color="#22c55e" />}
                            {cpStatus === "no_service" && <AlertTriangle size={16} color="#ef4444" />}
                          </div>
                        </div>
                        <input type="text" name="city" required={formData.isDelivery} value={formData.city} onChange={handleChange}
                          placeholder="Municipio / Ciudad"
                          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '0.95rem' }} />
                      </div>

                      {/* CP validation feedback */}
                      {cpStatus === "no_service" && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={16} color="#ef4444" />
                          <span style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600 }}>
                            Lo sentimos, este código postal no tiene servicio a domicilio. Puedes recoger tu pedido en el local.
                          </span>
                        </div>
                      )}
                      {cpStatus === "ok" && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.6rem 1rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle2 size={14} color="#22c55e" />
                          <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 600 }}>¡Tenemos reparto en tu zona!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Notas para el restaurante (opcional)</label>
                    <textarea name="deliveryNotes" value={formData.deliveryNotes} onChange={handleChange}
                      placeholder="Alergias, indicaciones para el repartidor..."
                      style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '0.95rem', minHeight: '70px', resize: 'vertical' }} />
                  </div>

                  {/* Payment method */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Método de Pago</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div onClick={() => setFormData(p => ({ ...p, paymentMethod: "CASH" }))}
                        style={{ flex: 1, border: `1px solid ${formData.paymentMethod === "CASH" ? "#f97316" : "#e2e8f0"}`, backgroundColor: formData.paymentMethod === "CASH" ? "rgba(249,115,22,0.05)" : "#f8fafc", padding: '1rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Banknote size={20} color={formData.paymentMethod === "CASH" ? "#f97316" : "#64748b"} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: formData.paymentMethod === "CASH" ? "#c2410c" : "#475569" }}>Efectivo</span>
                      </div>
                      <div style={{ flex: 1, border: '1px solid #e2e8f0', backgroundColor: "#f8fafc", padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
                        <CreditCard size={20} color="#64748b" />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: "#64748b" }}>Tarjeta (Próximamente)</span>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* RIGHT: Order Summary */}
            <div style={{ flex: '1 1 350px', padding: '1.5rem', backgroundColor: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <ShoppingBag size={18} color="#f97316" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Resumen de pedido</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, paddingBottom: '1.5rem' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', color: '#1e293b' }}>
                      <span style={{ color: '#f97316', fontWeight: 700, minWidth: '1.2rem' }}>{item.quantity}x</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{item.name}</span>
                        {item.options.length > 0 && (
                          <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {item.options.map((o: any) => o.modifierName).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                {isDeliveryMode && minOrder > 0 && (
                  <div style={{ marginBottom: '1.25rem', padding: '0.85rem', borderRadius: 8, background: belowMinimum ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${belowMinimum ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`, fontSize: '0.85rem' }}>
                    {belowMinimum
                      ? <span style={{ color: '#b45309' }}>⚠️ Faltan <b>{(minOrder - total).toFixed(2)}€</b> para tu pedido mínimo. Envío especial: <b>{deliveryFee.toFixed(2)}€</b>.</span>
                      : <span style={{ color: '#15803d' }}>✓ Pedido mínimo alcanzado (<b>{minOrder.toFixed(2)}€</b>). Envío: {deliveryFee === 0 ? 'Gratis' : `${deliveryFee.toFixed(2)}€`}.</span>
                    }
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>
                  <span>Subtotal</span><span style={{ fontWeight: 600 }}>{total.toFixed(2)}€</span>
                </div>
                {formData.isDelivery && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>
                    <span>Gasto de envío</span><span style={{ fontWeight: 600 }}>{deliveryFee.toFixed(2)}€</span>
                  </div>
                )}
                
                {/* COUPON SECTION */}
                <div style={{ margin: '1rem 0', padding: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                   {!appliedCoupon ? (
                      <div>
                         <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>¿Tienes un código?</label>
                         <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="EJ: ZAPIEAT20" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textTransform: 'uppercase' }} />
                            <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={{ padding: '0 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, color: '#475569', cursor: couponLoading || !couponCode ? 'not-allowed' : 'pointer' }}>
                               {couponLoading ? "..." : "Aplicar"}
                            </button>
                         </div>
                         {couponError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{couponError}</div>}
                      </div>
                   ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                            <span style={{ backgroundColor: '#22c55e', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800 }}>CUPÓN: {appliedCoupon.code}</span>
                            <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '0.2rem', fontWeight: 600 }}>{appliedCoupon.label}</div>
                         </div>
                         <button onClick={removeCoupon} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                      </div>
                   )}
                </div>

                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#16a34a', marginBottom: '0.5rem', fontWeight: 700 }}>
                     <span>Descuento aplicado</span><span>-{appliedCoupon.discountAmount.toFixed(2)}€</span>
                   </div>
                )}

                {/* LOYALTY POINTS SECTION */}
                {isLoggedIn && canRedeemPoints && (
                  <div style={{ margin: '1rem 0', padding: '1.25rem', background: useLoyaltyPoints ? 'rgba(249,115,22,0.05)' : '#fff', border: `1.5px dashed ${useLoyaltyPoints ? '#f97316' : '#e2e8f0'}`, borderRadius: '16px', transition: 'all 0.3s' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)' }}>
                              <Star size={22} fill="#fff" color="#fff" />
                           </div>
                           <div>
                              <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>Tus ZapiPoints</div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Tienes {loyaltyPoints} puntos ({(loyaltyPoints * loyaltyValue).toFixed(2)}€)</div>
                           </div>
                        </div>
                        <button 
                           type="button"
                           onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                           style={{ 
                             padding: '0.6rem 1.2rem', 
                             borderRadius: '10px', 
                             border: 'none',
                             background: useLoyaltyPoints ? '#f97316' : '#f1f5f9',
                             color: useLoyaltyPoints ? '#fff' : '#1e293b',
                             fontWeight: 800,
                             fontSize: '0.85rem',
                             cursor: 'pointer',
                             transition: 'all 0.2s',
                             boxShadow: useLoyaltyPoints ? '0 4px 12px rgba(249, 115, 22, 0.3)' : 'none'
                           }}
                        >
                           {useLoyaltyPoints ? "Puntos Aplicados ✓" : "Usar puntos"}
                        </button>
                     </div>
                  </div>
                )}

                {loyaltyDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#f97316', marginBottom: '0.5rem', fontWeight: 700 }}>
                    <span>Puntos canjeados</span><span>-{loyaltyDiscount.toFixed(2)}€</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, marginBottom: '1.5rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                  <span>Total a pagar</span><span>{finalGrandTotal.toFixed(2)}€</span>
                </div>

                <button
                  type="submit"
                  form="order-form"
                  className={styles.checkoutBtn}
                  disabled={loading || hardBlock || regStep !== "done" || (formData.isDelivery && cpStatus === "no_service")}
                  style={{
                    width: '100%', padding: '1rem', fontSize: '1.05rem', marginBottom: '0.75rem',
                    opacity: (hardBlock || regStep !== "done" || (formData.isDelivery && cpStatus === "no_service")) ? 0.4 : 1,
                    cursor: (hardBlock || regStep !== "done" || (formData.isDelivery && cpStatus === "no_service")) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? "Procesando..." : hardBlock
                    ? `Mínimo de ${minOrder.toFixed(2)}€ no alcanzado`
                    : (formData.isDelivery && cpStatus === "no_service")
                      ? "Código postal sin servicio"
                      : regStep !== "done"
                        ? "Identifícate para continuar"
                        : `Confirmar Pedido — ${grandTotal.toFixed(2)}€`
                  }
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Al confirmar, tu pedido será enviado al restaurante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
