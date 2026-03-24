"use client";

import React, { useState, useTransition } from "react";
import { Clock, Save, Info, Percent, Euro } from "lucide-react";
import { saveHappyHourConfigAction } from "./actions";

interface RestaurantSettings {
  id: string;
  happyHourActive: boolean;
  happyHourStartTime: string | null;
  happyHourEndTime: string | null;
  happyHourDays: number[];
}

interface Product {
  id: string;
  name: string;
  price: any;
  happyHourEnabled: boolean;
  happyHourDiscountType?: string;
  happyHourDiscount?: any;
}

export function HappyHourConfig({ 
  restaurant, 
  products 
}: { 
  restaurant: RestaurantSettings | null, 
  products: Product[] 
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [active, setActive] = useState(restaurant?.happyHourActive || false);
  const [startTime, setStartTime] = useState(restaurant?.happyHourStartTime || "17:00");
  const [endTime, setEndTime] = useState(restaurant?.happyHourEndTime || "20:00");
  const [days, setDays] = useState<number[]>(restaurant?.happyHourDays || []);
  
  // Use a dictionary to store selected products and their custom discount config
  const [productSettings, setProductSettings] = useState<Record<string, { type: string, discount: string }>>(() => {
    const initial: Record<string, { type: string, discount: string }> = {};
    products.forEach(p => {
      if (p.happyHourEnabled) {
        initial[p.id] = { 
          type: p.happyHourDiscountType || "PERCENTAGE", 
          discount: p.happyHourDiscount?.toString() || "20" 
        };
      }
    });
    return initial;
  });

  const toggleDay = (dayIndex: number) => {
    if (days.includes(dayIndex)) {
      setDays(days.filter(d => d !== dayIndex));
    } else {
      setDays([...days, dayIndex]);
    }
  };

  const toggleProduct = (productId: string) => {
    setProductSettings(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = { type: "PERCENTAGE", discount: "20" };
      }
      return next;
    });
  };

  const updateProductConfig = (productId: string, type: string, discount: string) => {
    setProductSettings(prev => ({
      ...prev,
      [productId]: { type, discount }
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    formData.append("happyHourActive", active.toString());
    days.forEach(d => formData.append("happyHourDays", d.toString()));
    
    const productsData = Object.entries(productSettings).map(([id, config]) => ({
      id,
      type: config.type,
      discount: config.discount
    }));
    formData.append("productsData", JSON.stringify(productsData));
    
    startTransition(async () => {
      setErrorMsg(null);
      const res = await saveHappyHourConfigAction(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      }
    });
  };

  const calculateDiscount = (priceRaw: any, config: { type: string, discount: string }) => {
    const currentPrice = parseFloat(priceRaw?.toString() || "0");
    const discountVal = parseFloat(config.discount || "0");
    if (config.type === "PERCENTAGE") {
      return (currentPrice * (1 - discountVal / 100)).toFixed(2);
    } else {
      const finalPrice = currentPrice - discountVal;
      return finalPrice > 0 ? finalPrice.toFixed(2) : "0.00";
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errorMsg && (
        <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#f87171", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.875rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          {errorMsg}
        </div>
      )}

      {/* GLOBAL SETTINGS */}
      <div style={{ backgroundColor: "rgba(168, 85, 247, 0.05)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid rgba(168, 85, 247, 0.2)", marginBottom: "2rem" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, fontSize: "1.25rem", color: "#c084fc" }}>
            <Clock size={24} /> Horario y Días Activos
          </h2>
          
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: "bold", color: "#fafaf9" }}>
             Activar Happy Hour
            <input 
              type="checkbox" 
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ width: "1.25rem", height: "1.25rem", accentColor: "#a855f7" }}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", opacity: active ? 1 : 0.6, pointerEvents: active ? "auto" : "none" }}>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem", color: "#fafaf9" }}>Hora Inicio</label>
              <input 
                type="time" 
                name="happyHourStartTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", color: "#fafaf9" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem", color: "#fafaf9" }}>Hora Fin</label>
              <input 
                type="time" 
                name="happyHourEndTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", color: "#fafaf9" }}
              />
            </div>
          </div>

          <div>
             <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem", color: "#fafaf9" }}>Días Activos</label>
             <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
               {["D", "L", "M", "X", "J", "V", "S"].map((dayName, idx) => (
                 <button 
                   type="button"
                   key={idx}
                   onClick={() => toggleDay(idx)}
                   style={{ 
                     width: "2.5rem", height: "2.5rem", borderRadius: "50%", 
                     border: "1px solid", 
                     borderColor: days.includes(idx) ? "#a855f7" : "rgba(255,255,255,0.2)",
                     backgroundColor: days.includes(idx) ? "#a855f7" : "rgba(255,255,255,0.05)",
                     color: days.includes(idx) ? "white" : "#d6d3d1",
                     fontWeight: 600, cursor: "pointer"
                   }}
                 >
                   {dayName}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>


      {/* PRODUCT LIST */}
      <div>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem", color: "#fafaf9" }}>
          Descuentos por Producto
          <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "#a8a29e", backgroundColor: "rgba(255,255,255,0.1)", padding: "0.2rem 0.6rem", borderRadius: "1rem" }}>
            {Object.keys(productSettings).length} activados
          </span>
        </h3>
        
        <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", overflow: "hidden", display: "flex", flexDirection: "column" }}>
           {products.length === 0 ? (
             <div style={{ padding: "2rem", textAlign: "center", color: "#a8a29e" }}>No hay productos en tu carta para aplicar el Happy Hour.</div>
           ) : (
             products.map((p, index) => {
               const config = productSettings[p.id];
               const isSelected = !!config;

               return (
                 <div
                   key={p.id} 
                   style={{ 
                     display: "flex", flexDirection: "column", gap: "1rem",
                     padding: "1rem", 
                     borderBottom: index < products.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                     backgroundColor: isSelected ? "rgba(168, 85, 247, 0.05)" : "transparent",
                   }}
                 >
                   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => toggleProduct(p.id)}>
                     <div>
                       <span style={{ fontWeight: 500, color: "#fafaf9" }}>{p.name}</span> <span style={{ color: "#a8a29e" }}>({p.price?.toString()}€)</span>
                       {isSelected && active && (
                         <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#c084fc" }}>
                           Precio final: {calculateDiscount(p.price, config)}€
                         </p>
                       )}
                     </div>
                     <input 
                       type="checkbox" 
                       checked={isSelected}
                       readOnly
                       style={{ width: "1.25rem", height: "1.25rem", accentColor: "#a855f7", pointerEvents: "none" }}
                     />
                   </div>

                   {/* Configurador Específico de este producto */}
                   {isSelected && (
                     <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "1rem", marginTop: "0.5rem", borderLeft: "2px solid #a855f7" }}>
                        <input 
                          type="number" 
                          min="0.1" step="0.1" max={config.type === "PERCENTAGE" ? "100" : "1000"}
                          value={config.discount}
                          onChange={(e) => updateProductConfig(p.id, config.type, e.target.value)}
                          style={{ width: "100px", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", color: "#fafaf9" }}
                        />
                        <div style={{ display: "flex", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.25rem" }}>
                          <button 
                            type="button" 
                            onClick={() => updateProductConfig(p.id, "PERCENTAGE", config.discount)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", background: config.type === "PERCENTAGE" ? "#a855f7" : "transparent", color: config.type === "PERCENTAGE" ? "white" : "#a8a29e", border: "none", cursor: "pointer" }}
                          >
                            <Percent size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => updateProductConfig(p.id, "FIXED_AMOUNT", config.discount)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", background: config.type === "FIXED_AMOUNT" ? "#a855f7" : "transparent", color: config.type === "FIXED_AMOUNT" ? "white" : "#a8a29e", border: "none", cursor: "pointer" }}
                          >
                            <Euro size={14} />
                          </button>
                        </div>
                     </div>
                   )}

                 </div>
               );
             })
           )}
        </div>
      </div>

      <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end", position: "sticky", bottom: "1rem" }}>
        <button 
          type="submit" 
          disabled={isPending}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#f97316", color: "white", padding: "0.75rem 1.5rem", borderRadius: "0.75rem", fontWeight: 600, cursor: "pointer", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
        >
           <Save size={18} />
           {isPending ? "Guardando Configuración..." : "Guardar Happy Hour"}
        </button>
      </div>

    </form>
  );
}
