"use client";

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Order {
  total: number | string;
  createdAt: Date;
  status: string;
}

interface RevenueChartProps {
  orders: Order[];
  range: string;
}

export function RevenueChart({ orders, range }: RevenueChartProps) {
  const chartData = useMemo(() => {
    // Orders pasados ya están filtrados desde el servidor (no Cancelados ni Pending_Payment)
    const validOrders = orders;
    
    // Si no hay pedidos, devolver array curado vacío
    if (validOrders.length === 0) return [];

    const map = new Map<string, number>();

    validOrders.forEach(o => {
      const date = new Date(o.createdAt);
      let key = "";
      
      // La clave de agrupación cambia según el rango seleccionado
      if (range === 'today' || range === 'yesterday') {
        // Agrupar por hora
        const h = date.getHours().toString().padStart(2, '0');
        key = `${h}:00`;
      } else if (range === 'this_year') {
        // Agrupar por mes
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        key = monthNames[date.getMonth()];
      } else {
        // Agrupar por día
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        key = `${d}/${m}`;
      }

      const total = Number(o.total);
      map.set(key, (map.get(key) || 0) + total);
    });

    // Ordenar las claves dependiendo del agrupamiento si es necesario
    // Pero como creamos las fechas, vamos a extraerlas en orden temporal desde los datos originales 
    // O si es 'this_year' u otros, la iteración del mapa puede ser caótica. 
    // Mejor generamos un array base con los rangos si podemos, o simplemente ordenamos cronológicamente.
    
    let sortedKeys = Array.from(map.keys());
    if (range === 'today' || range === 'yesterday') {
      sortedKeys.sort((a, b) => a.localeCompare(b));
    } else if (range === 'this_year') {
      const mn = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      sortedKeys.sort((a, b) => mn.indexOf(a) - mn.indexOf(b));
    } else {
      // DD/MM (simple string sort doesn't work perfectly across years, but for 7d/30d within same year it's passable)
      // Actually we will just sort by month then day: mm/dd 
      sortedKeys.sort((a, b) => {
        const [d1, m1] = a.split('/');
        const [d2, m2] = b.split('/');
        if (m1 !== m2) return Number(m1) - Number(m2);
        return Number(d1) - Number(d2);
      });
    }

    return sortedKeys.map(key => ({
      name: key,
      Ingresos: Number(map.get(key)?.toFixed(2) || 0)
    }));
  }, [orders, range]);

  if (chartData.length === 0) {
    return (
      <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716c', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
        No hay datos suficientes para generar la gráfica en este periodo.
      </div>
    );
  }

  return (
    <div style={{ height: '350px', width: '100%', marginTop: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#78716c', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#78716c', fontSize: 12 }}
            tickFormatter={(value) => `€${value}`}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
            formatter={(value: any) => [`${Number(value).toFixed(2)} €`, 'Ingresos']}
          />
          <Area 
            type="monotone" 
            dataKey="Ingresos" 
            stroke="#f97316" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorIngresos)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
