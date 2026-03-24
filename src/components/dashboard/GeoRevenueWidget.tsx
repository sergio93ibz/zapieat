"use client";

import React, { useMemo } from 'react';
import { MapPin, TrendingUp } from 'lucide-react';

interface Order {
  total: number | string;
  isDelivery: boolean;
  deliveryAddress?: string | null;
  status: string;
}

export function GeoRevenueWidget({ orders }: { orders: Order[] }) {
  const data = useMemo(() => {
    const validOrders = orders.filter(o => o.isDelivery && (o.status === 'DELIVERED' || o.status === 'PAID'));
    const zones = new Map<string, { revenue: number, count: number }>();

    validOrders.forEach(o => {
      if (!o.deliveryAddress) return;
      
      // Intentar extraer el código postal (5 dígitos numéricos en España)
      const cpMatch = o.deliveryAddress.match(/\b\d{5}\b/);
      let zoneName = "Desconocida";
      
      if (cpMatch) {
        zoneName = `Zona ${cpMatch[0]}`;
      } else {
        // En su defecto, intentar coger la ciudad si está en el formato "calle, cp, ciudad"
        const parts = o.deliveryAddress.split(',');
        if (parts.length > 1) {
          zoneName = parts[parts.length - 1].trim();
        }
      }

      const rev = Number(o.total);
      if (!zones.has(zoneName)) {
        zones.set(zoneName, { revenue: 0, count: 0 });
      }
      
      const current = zones.get(zoneName)!;
      current.revenue += rev;
      current.count += 1;
    });

    // Ordenar de mayor a menor ingreso
    const sorted = Array.from(zones.entries())
      .map(([name, stats]) => ({
        name,
        revenue: stats.revenue,
        count: stats.count,
        avgTicket: stats.count > 0 ? stats.revenue / stats.count : 0
      }))
      .filter(z => z.name !== "Desconocida") // Filter out unknown zones to keep it clean, unless it's the only one
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // top 5 zones

    if (sorted.length === 0 && zones.has("Desconocida")) {
       return [{
         name: "Desconocida",
         revenue: zones.get("Desconocida")!.revenue,
         count: zones.get("Desconocida")!.count,
         avgTicket: zones.get("Desconocida")!.revenue / zones.get("Desconocida")!.count
       }]
    }

    return sorted;
  }, [orders]);

  if (data.length === 0) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716c' }}>
        No hay datos de reparto en el periodo seleccionado.
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {data.map((zone, idx) => {
        const percentage = maxRevenue > 0 ? (zone.revenue / maxRevenue) * 100 : 0;
        return (
          <div key={idx} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600, color: '#fafaf9', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="#f97316" /> {zone.name}
              </span>
              <span style={{ fontWeight: 700, color: '#f97316' }}>{zone.revenue.toFixed(2)}€</span>
            </div>
            
            {/* ProgressBar */}
            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
               <div style={{ 
                 height: '100%', 
                 width: `${percentage}%`, 
                 background: idx === 0 ? 'linear-gradient(90deg, #f97316, #fb923c)' : '#57534e',
                 borderRadius: 4
               }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: '#a8a29e' }}>
              <span>{zone.count} envíos realizados</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {idx === 0 && <span style={{ color: '#fbbf24', fontWeight: 600 }}>TICKET ORO: </span>}
                Medio: {zone.avgTicket.toFixed(2)}€
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
