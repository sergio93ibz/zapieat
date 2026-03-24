"use client";

import React, { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCouponAction, toggleCouponActiveAction } from "./actions";

export function CouponTableActions({ coupon }: { coupon: any }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(() => {
      toggleCouponActiveAction(coupon.id, !coupon.active);
    });
  };

  const handleDelete = () => {
    if (confirm("¿Seguro que quieres eliminar este cupón?")) {
      startTransition(() => {
        deleteCouponAction(coupon.id);
      });
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
        <input 
          type="checkbox" 
          checked={coupon.active} 
          onChange={handleToggle} 
          disabled={isPending}
          style={{ accentColor: "#f97316", width: "1.2rem", height: "1.2rem" }}
        />
        <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: coupon.active ? "#4ade80" : "#a8a29e" }}>
          {coupon.active ? "Activo" : "Pausado"}
        </span>
      </label>

      <button 
        onClick={handleDelete} 
        disabled={isPending}
        style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "0.25rem", opacity: isPending ? 0.5 : 1 }}
        title="Eliminar Cupón"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
