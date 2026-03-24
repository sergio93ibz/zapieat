"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const range = searchParams.get("range") || "today";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", e.target.value);
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
      <Calendar size={18} color="#f97316" />
      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fafaf9" }}>Filtrar por fecha:</span>
      <select
        value={range}
        onChange={handleChange}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fafaf9",
          padding: "0.4rem 0.8rem",
          borderRadius: "8px",
          outline: "none",
          fontSize: "0.85rem",
          cursor: "pointer",
        }}
      >
        <option value="today" style={{ background: "#111" }}>Hoy</option>
        <option value="yesterday" style={{ background: "#111" }}>Ayer</option>
        <option value="7d" style={{ background: "#111" }}>Últimos 7 días</option>
        <option value="30d" style={{ background: "#111" }}>Últimos 30 días</option>
        <option value="this_month" style={{ background: "#111" }}>Este mes</option>
        <option value="this_year" style={{ background: "#111" }}>Este año</option>
        <option value="all" style={{ background: "#111" }}>Histórico completo</option>
      </select>
    </div>
  );
}
