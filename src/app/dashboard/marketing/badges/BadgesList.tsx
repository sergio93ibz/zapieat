"use client";

import React, { useState, useTransition } from "react";
import { Star, Flame, Save, X, Edit3 } from "lucide-react";
import { updateProductBadgesAction } from "./actions";

interface Product {
  id: string;
  name: string;
  price: any;
  isRecommended: boolean;
  isBestSeller: boolean;
}

export function BadgesList({ products }: { products: Product[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isRecommended, setIsRecommended] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setIsRecommended(p.isRecommended);
    setIsBestSeller(p.isBestSeller);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;

    const formData = new FormData(e.currentTarget);
    formData.append("productId", editingId);
    
    if (isRecommended) formData.append("isRecommended", "on");
    if (isBestSeller) formData.append("isBestSeller", "on");

    startTransition(async () => {
      setErrorMsg(null);
      const res = await updateProductBadgesAction(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setEditingId(null);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {products.length === 0 ? (
        <p style={{ color: "#a8a29e", textAlign: "center", padding: "2rem" }}>Aún no tienes productos en tu carta.</p>
      ) : (
        products.map((product) => (
          <div key={product.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.02)" }}>
            
            {editingId !== product.id ? (
              <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600, color: "#fafaf9" }}>
                    {product.name}
                  </h3>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
                    {product.isRecommended && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)", padding: "0.2rem 0.5rem", borderRadius: "1rem" }}>
                        <Star size={14} /> Recomendado
                      </span>
                    )}
                    {product.isBestSeller && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", padding: "0.2rem 0.5rem", borderRadius: "1rem" }}>
                        <Flame size={14} /> Más Vendido
                      </span>
                    )}
                    {!product.isRecommended && !product.isBestSeller && (
                      <span style={{ color: "#78716c" }}>Sin insignias</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => handleEdit(product)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", cursor: "pointer", color: "#e7e5e4" }}
                >
                  <Edit3 size={16} /> Configurar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: "1.5rem", backgroundColor: "rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#fafaf9" }}>{product.name}</h3>
                  <button type="button" onClick={() => setEditingId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8a29e" }}>
                    <X size={20} />
                  </button>
                </div>

                {errorMsg && (
                   <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#f87171", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                     {errorMsg}
                   </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.95rem", color: "#e7e5e4" }}>
                    <input type="checkbox" checked={isRecommended} onChange={(e) => setIsRecommended(e.target.checked)} style={{ width: "1.25rem", height: "1.25rem", accentColor: "#ec4899" }} />
                    <span><strong style={{ color: "#ec4899" }}>Recomendado</strong> (Destacará con una estrella)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.95rem", color: "#e7e5e4" }}>
                    <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} style={{ width: "1.25rem", height: "1.25rem", accentColor: "#f97316" }} />
                    <span><strong style={{ color: "#f97316" }}>Más Vendido</strong> (Destacará con un icono de fuego)</span>
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                  <button type="button" onClick={() => setEditingId(null)} disabled={isPending} style={{ padding: "0.5rem 1rem", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "0.5rem", cursor: "pointer", color: "#e7e5e4", fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isPending} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", backgroundColor: "#f97316", border: "none", borderRadius: "0.5rem", cursor: "pointer", color: "white", fontWeight: 600 }}>
                    <Save size={16} /> {isPending ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ))
      )}
    </div>
  );
}
