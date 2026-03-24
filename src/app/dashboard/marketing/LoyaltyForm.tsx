"use client";

import React, { useState, useTransition } from "react";
import styles from "./marketing.module.css";
import { updateLoyaltySettingsAction } from "./actions";
import { Check } from "lucide-react";

interface LoyaltyFormProps {
  restaurant: any;
}

export function LoyaltyForm({ restaurant }: LoyaltyFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(restaurant.enableLoyalty || false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      setSuccess(false);
      setErrorMsg(null);
      const res = await updateLoyaltySettingsAction(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  return (
    <div className={styles.formCard}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fafaf9", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.5rem" }}>💎</span> Programa de Puntos
      </h2>
      
      {success && <div className={styles.alertSuccess}>Ajustes de fidelidad guardados.</div>}
      {errorMsg && <div className={styles.alertError}>{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", cursor: "pointer" }}>
          <div style={{ position: "relative", width: "48px", height: "24px" }}>
            <input 
              type="checkbox" 
              name="enableLoyalty" 
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }} 
            />
            <span style={{
              position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: enabled ? "#f97316" : "#444", borderRadius: "24px", transition: "0.2s"
            }}>
              <span style={{
                position: "absolute", height: "18px", width: "18px", left: enabled ? "26px" : "3px", bottom: "3px",
                backgroundColor: "white", borderRadius: "50%", transition: "0.2s"
              }}/>
            </span>
          </div>
          <span style={{ fontWeight: 500, color: enabled ? "#f97316" : "#a8a29e" }}>
            {enabled ? "Programa de Fidelidad Activado" : "Click para Activar"}
          </span>
        </label>

        {enabled && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className={styles.inputGroup}>
               <label className={styles.label}>Puntos por cada 1€ gastado</label>
               <input type="number" name="loyaltyPointsPerEuro" defaultValue={restaurant.loyaltyPointsPerEuro} min="1" className={styles.input} disabled={isPending} required />
               <p className={styles.hint}>Ej: Si pones 10, un pedido de 20€ da 200 pts.</p>
            </div>
            
            <div className={styles.inputGroup}>
               <label className={styles.label}>Valor de 1 Punto (€)</label>
               <input type="number" name="loyaltyPointsValue" defaultValue={restaurant.loyaltyPointsValue} step="0.01" min="0.01" className={styles.input} disabled={isPending} required />
               <p className={styles.hint}>Ej: 0.05 significa que cada punto vale 5 céntimos.</p>
            </div>
            
            <div className={styles.inputGroup}>
               <label className={styles.label}>Mínimo puntos para canjear</label>
               <input type="number" name="loyaltyMinPointsToRedeem" defaultValue={restaurant.loyaltyMinPointsToRedeem} min="1" className={styles.input} disabled={isPending} required />
               <p className={styles.hint}>Ej: 100 puntos para poder usarlos.</p>
            </div>
          </div>
        )}

        {enabled && (
           <div style={{ backgroundColor: "rgba(249,115,22,0.1)", padding: "1rem", borderRadius: "0.5rem", marginBottom: "2rem", border: "1px solid rgba(249,115,22,0.2)" }}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#fdba74" }}>
                💡 <strong>Ejemplo de tu configuración:</strong><br/>
                Para usar descuentos un cliente deberá gastar al menos <strong>{enabled ? ((restaurant.loyaltyMinPointsToRedeem || 100) / (restaurant.loyaltyPointsPerEuro || 1)).toFixed(2) : 0}€</strong>.
                Una vez acumulados {(restaurant.loyaltyMinPointsToRedeem || 100)} puntos, el cliente tendrá un descuento de <strong>{((restaurant.loyaltyMinPointsToRedeem || 100) * (restaurant.loyaltyPointsValue || 0.05)).toFixed(2)}€</strong> en su próximo pedido.
              </p>
           </div>
        )}

        <div>
          <button type="submit" className={styles.btnSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar Ajustes"}
          </button>
        </div>
      </form>
    </div>
  );
}
