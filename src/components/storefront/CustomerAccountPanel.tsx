"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, UserCircle, MapPin, ShoppingBag, Star, CreditCard, LogOut,
  Pencil, Plus, Trash2, Check, ChevronRight, Package, Clock, Info
} from "lucide-react";
import {
  customerLogoutAction,
  updateCustomerProfileAction,
  addCustomerAddressAction,
  removeCustomerAddressAction,
  getCustomerDataAction,
} from "@/app/[slug]/customerActions";

type Tab = "profile" | "orders" | "addresses" | "payments";

export function CustomerAccountPanel({
  customerId,
  onClose,
  loyaltySettings,
}: {
  customerId: string;
  onClose: () => void;
  loyaltySettings?: {
    enabled: boolean;
    pointsValue: number;
    minPoints: number;
    pointsPerEuro: number;
  };
}) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile editing
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Address form
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrLabel, setAddrLabel] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addingAddr, setAddingAddr] = useState(false);

  useEffect(() => {
    setMounted(true);
    getCustomerDataAction(customerId).then((res) => {
      if (res.success) {
        setCustomer(res.customer);
        setOrders(res.orders);
        setEditName(res.customer?.name || "");
        setEditEmail(res.customer?.email || "");
      }
      setLoading(false);
    });
  }, [customerId]);

  async function handleSaveProfile() {
    setSaving(true);
    await updateCustomerProfileAction(customerId, { name: editName, email: editEmail });
    setCustomer((prev: any) => ({ ...prev, name: editName, email: editEmail }));
    setSaving(false);
    setEditMode(false);
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddingAddr(true);
    const res = await addCustomerAddressAction(customerId, {
      label: addrLabel,
      street: addrStreet,
      postalCode: addrPostal,
      city: addrCity,
    });
    if (res.success) {
      const updated = await getCustomerDataAction(customerId);
      if (updated.success) setCustomer(updated.customer);
      setAddrLabel(""); setAddrStreet(""); setAddrPostal(""); setAddrCity("");
      setShowAddAddress(false);
    }
    setAddingAddr(false);
  }

  async function handleRemoveAddress(addressId: string) {
    await removeCustomerAddressAction(customerId, addressId);
    const updated = await getCustomerDataAction(customerId);
    if (updated.success) setCustomer(updated.customer);
  }

  async function handleLogout() {
    await customerLogoutAction();
    window.location.reload();
  }

  const savedAddresses: any[] = (customer?.savedAddresses as any[]) || [];

  if (!mounted) return null;

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: "Pendiente de pago", color: "#f59e0b" },
    PAID:            { label: "Pagado", color: "#3b82f6" },
    PREPARING:       { label: "En preparación", color: "#8b5cf6" },
    READY:           { label: "Listo", color: "#22c55e" },
    DELIVERED:       { label: "Entregado", color: "#6b7280" },
    CANCELLED:       { label: "Cancelado", color: "#ef4444" },
  };

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "profile",   icon: <UserCircle size={18} />, label: "Perfil" },
    { id: "addresses", icon: <MapPin size={18} />,     label: "Direcciones" },
    { id: "orders",    icon: <ShoppingBag size={18} />, label: "Pedidos" },
    { id: "payments",  icon: <CreditCard size={18} />, label: "Pagos" },
  ];

  const panel = (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", justifyContent: "flex-end",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: "480px", background: "#fafafa",
          height: "100%", overflowY: "auto", display: "flex", flexDirection: "column",
          boxShadow: "-10px 0 40px rgba(0,0,0,0.2)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* PANEL HEADER */}
        <div style={{
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          padding: "1.5rem", color: "#fff", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900 }}>Mi Cuenta</h2>
              <div style={{ fontSize: "0.9rem", opacity: 0.9, marginTop: "0.2rem" }}>
                {loading ? "..." : (customer?.name || customer?.phone || "Cliente")}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={20} />
            </button>
          </div>

          {/* Loyalty Section */}
          <div style={{
            background: "rgba(255,255,255,0.15)", borderRadius: "16px",
            padding: "1rem", marginTop: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(5px)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem" }}>
                <Star size={18} fill="#fff" /> ZapiPoints
              </div>
              <span style={{ 
                background: loyaltySettings?.enabled ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.15)", 
                fontSize: "0.65rem", padding: "0.2rem 0.6rem", borderRadius: "99px",
                fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px"
              }}>
                {loyaltySettings?.enabled ? "Activo" : "Próximamente"}
              </span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 }}>
                {loading ? "..." : (customer?.loyaltyPoints ?? 0)}
                <span style={{ fontSize: "0.9rem", marginLeft: "0.3rem", opacity: 0.8, fontWeight: 600 }}>pts</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: 600 }}>Valor estimado</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                  {loading ? "..." : ((customer?.loyaltyPoints ?? 0) * (loyaltySettings?.pointsValue || 0)).toFixed(2)}€
                </div>
              </div>
            </div>

            {loyaltySettings?.enabled && (customer?.loyaltyPoints ?? 0) < (loyaltySettings?.minPoints || 0) && (
              <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", opacity: 0.9, background: "rgba(0,0,0,0.1)", padding: "0.4rem 0.6rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Info size={12} /> Mínimo {loyaltySettings.minPoints} pts para canjear
              </div>
            )}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #eee", padding: "0 0.5rem" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: "0.9rem 0.4rem", border: "none",
                borderBottom: activeTab === t.id ? "3px solid #f97316" : "3px solid transparent",
                background: "transparent",
                color: activeTab === t.id ? "#f97316" : "#888",
                fontWeight: activeTab === t.id ? 800 : 500,
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                fontSize: "0.75rem",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#aaa", paddingTop: "3rem" }}>Cargando...</div>
          ) : (
            <>
              {/* ── PERFIL ── */}
              {activeTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                      <h3 style={{ margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <UserCircle size={20} /> Datos Personales
                      </h3>
                      {!editMode && (
                        <button onClick={() => setEditMode(true)} style={{ background: "#f5f5f5", border: "none", borderRadius: "8px", padding: "0.4rem 0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: "0.85rem" }}>
                          <Pencil size={14} /> Editar
                        </button>
                      )}
                    </div>

                    {editMode ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#555" }}>Nombre</label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Tu nombre"
                          style={{ padding: "0.8rem 1rem", borderRadius: "8px", border: "2px solid #eee", fontSize: "1rem", outline: "none" }}
                        />
                        <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#555" }}>Email</label>
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="tu@email.com"
                          type="email"
                          style={{ padding: "0.8rem 1rem", borderRadius: "8px", border: "2px solid #eee", fontSize: "1rem", outline: "none" }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                          <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            style={{ flex: 1, background: "#f97316", color: "#fff", border: "none", borderRadius: "8px", padding: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                          >
                            <Check size={16} /> {saving ? "Guardando..." : "Guardar"}
                          </button>
                          <button
                            onClick={() => setEditMode(false)}
                            style={{ flex: 1, background: "#eee", color: "#333", border: "none", borderRadius: "8px", padding: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                        {[
                          { label: "Teléfono", val: customer?.phone || "No establecido" },
                          { label: "Nombre",   val: customer?.name  || "—" },
                          { label: "Email",    val: customer?.email || "—" },
                        ].map((row) => (
                          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid #f5f5f5" }}>
                            <span style={{ color: "#888", fontSize: "0.9rem" }}>{row.label}</span>
                            <span style={{ fontWeight: 600 }}>{row.val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLogout}
                    style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "12px", padding: "1rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    <LogOut size={18} /> Cerrar Sesión
                  </button>
                </div>
              )}

              {/* ── DIRECCIONES ── */}
              {activeTab === "addresses" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {savedAddresses.length === 0 && !showAddAddress && (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>
                      <MapPin size={40} style={{ marginBottom: "1rem", opacity: 0.3 }} />
                      <p>Sin direcciones guardadas. Añade una para hacer pedidos más rápido.</p>
                    </div>
                  )}

                  {savedAddresses.map((addr: any) => (
                    <div key={addr.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.2rem", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 800, marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <MapPin size={16} color="#f97316" /> {addr.label}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#555" }}>
                          {addr.street}, {addr.postalCode} {addr.city}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAddress(addr.id)}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.4rem" }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  {showAddAddress ? (
                    <form onSubmit={handleAddAddress} style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #eee", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: 800 }}>Nueva dirección</h4>
                      {[
                        { label: "Etiqueta (ej: Casa, Trabajo)", val: addrLabel, set: setAddrLabel, placeholder: "Casa" },
                        { label: "Calle y número",               val: addrStreet, set: setAddrStreet, placeholder: "Calle Mayor 1, 2ºA" },
                        { label: "Código postal",                val: addrPostal, set: setAddrPostal, placeholder: "28001" },
                        { label: "Ciudad",                       val: addrCity,   set: setAddrCity,   placeholder: "Madrid" },
                      ].map((f) => (
                        <div key={f.label}>
                          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#555", display: "block", marginBottom: "0.3rem" }}>{f.label}</label>
                          <input
                            value={f.val}
                            onChange={(e) => f.set(e.target.value)}
                            placeholder={f.placeholder}
                            required
                            style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "8px", border: "2px solid #eee", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="submit" disabled={addingAddr} style={{ flex: 1, background: "#f97316", color: "#fff", border: "none", borderRadius: "8px", padding: "0.8rem", fontWeight: 800, cursor: "pointer" }}>
                          {addingAddr ? "Guardando..." : "Guardar"}
                        </button>
                        <button type="button" onClick={() => setShowAddAddress(false)} style={{ flex: 1, background: "#eee", color: "#333", border: "none", borderRadius: "8px", padding: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddAddress(true)}
                      style={{ background: "#fff", border: "2px dashed #f97316", borderRadius: "12px", padding: "1rem", color: "#f97316", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                    >
                      <Plus size={18} /> Añadir dirección
                    </button>
                  )}
                </div>
              )}

              {/* ── PEDIDOS ── */}
              {activeTab === "orders" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {orders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>
                      <Package size={40} style={{ marginBottom: "1rem", opacity: 0.3 }} />
                      <p>Sin pedidos todavía. ¡Haz tu primer pedido!</p>
                    </div>
                  ) : orders.map((o: any) => {
                    const statusInfo = STATUS_LABELS[o.status] || { label: o.status, color: "#888" };
                    return (
                      <div key={o.id} style={{ background: "#fff", borderRadius: "16px", border: "1px solid #eee", overflow: "hidden" }}>
                        <div style={{ padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f5f5f5" }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "1rem" }}>Pedido #{o.orderNumber}</div>
                            <div style={{ fontSize: "0.8rem", color: "#888", display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.2rem" }}>
                              <Clock size={12} /> {new Date(o.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <div style={{ background: statusInfo.color + "20", color: statusInfo.color, padding: "0.3rem 0.8rem", borderRadius: "99px", fontWeight: 800, fontSize: "0.8rem" }}>
                            {statusInfo.label}
                          </div>
                        </div>
                        <div style={{ padding: "0.8rem 1.2rem" }}>
                          {o.items?.map((item: any) => (
                            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "0.3rem 0" }}>
                              <span style={{ color: "#555" }}>{item.quantity}x {item.productNameSnapshot}</span>
                              <span style={{ fontWeight: 600 }}>{Number(item.unitPrice * item.quantity).toFixed(2)}€</span>
                            </div>
                          ))}
                          <div style={{ marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                            <span>Total</span>
                            <span style={{ color: "#f97316" }}>{Number(o.total).toFixed(2)}€</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── PAGOS ── */}
              {activeTab === "payments" && (
                <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>
                  <CreditCard size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, fontSize: "1rem" }}>Guardado de tarjetas</p>
                  <p style={{ fontSize: "0.9rem" }}>Esta función estará disponible próximamente con integración Stripe.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
