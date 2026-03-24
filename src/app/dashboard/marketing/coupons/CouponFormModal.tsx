"use client";

import React, { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import styles from "../../menu/modal.module.css";
import parentStyles from "../marketing.module.css";
import { createCouponAction } from "./actions";
import { Portal } from "@/components/ui/Portal";

interface Product {
  id: string;
  name: string;
  price: number;
}

export function CouponFormModal({ products }: { products: Product[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<{ error?: string } | null>(null);
  
  const [discountType, setDiscountType] = useState("PERCENTAGE");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      setError(null);
      const result = await createCouponAction(formData);
      if (result?.error) {
        setError({ error: result.error });
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button className={parentStyles.btnPrimary} onClick={() => setIsOpen(true)}>
        <Plus size={16} /> Crear Cupón
      </button>

      {isOpen && (
        <Portal>
          <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}>
            <div className={styles.modal}>
              <div className={styles.header}>
                <h3 className={styles.title}>Nuevo Cupón de Descuento</h3>
                <button className={styles.closeBtn} onClick={() => setIsOpen(false)} type="button">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className={styles.formContainer} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className={styles.form} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                  
                  {errorObj?.error && (
                    <div className={styles.errorAlert}>{errorObj.error}</div>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Código del Cupón *</label>
                    <input type="text" name="code" required className={styles.input} placeholder="Ej. VERANO20" style={{ textTransform: "uppercase" }} disabled={isPending} />
                    <p style={{ fontSize: "0.75rem", color: "#a8a29e", marginTop: "0.25rem" }}>Los clientes escribirán este código en el carrito.</p>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Tipo de Descuento *</label>
                    <select name="discountType" className={styles.select} value={discountType} onChange={(e) => setDiscountType(e.target.value)} disabled={isPending}>
                      <option value="PERCENTAGE">Porcentaje (%)</option>
                      <option value="FIXED_AMOUNT">Cantidad Fija (€)</option>
                      <option value="FREE_PRODUCT">Producto Gratis</option>
                    </select>
                  </div>

                  {discountType !== "FREE_PRODUCT" ? (
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Valor / Cantidad *</label>
                      <input type="number" name="discountValue" step="0.01" min="0.01" required className={styles.input} placeholder={discountType === "PERCENTAGE" ? "Ej. 20 (%)" : "Ej. 5.00 (€)"} disabled={isPending} />
                    </div>
                  ) : (
                    <>
                      <input type="hidden" name="discountValue" value="0" />
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Producto a Regalar *</label>
                        <select name="freeProductId" className={styles.select} required disabled={isPending}>
                          <option value="">Selecciona el producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Valor: {p.price}€)</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.label}>Pedido Mínimo (€)</label>
                      <input type="number" name="minOrderAmount" step="0.01" min="0" className={styles.input} placeholder="Opcional" disabled={isPending} />
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.label}>Límite de Usos</label>
                      <input type="number" name="maxUses" min="1" className={styles.input} placeholder="Opcional" disabled={isPending} />
                      <p style={{ fontSize: "0.7rem", color: "#a8a29e", marginTop: "0.25rem" }}>Total de veces que se puede usar en la web.</p>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Fecha de Caducidad</label>
                    <input type="date" name="expiresAt" className={styles.input} disabled={isPending} />
                    <p style={{ fontSize: "0.7rem", color: "#a8a29e", marginTop: "0.25rem" }}>Si se deja en blanco no caducará nunca.</p>
                  </div>

                </div>

                <div className={styles.footer}>
                  <button type="button" className={styles.btnCancel} onClick={() => setIsOpen(false)} disabled={isPending}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.btnSubmit} disabled={isPending}>
                    {isPending ? "Creando..." : "Crear Cupón"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
