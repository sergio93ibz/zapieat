"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Maximize, LayoutList, Layers, Bell, BellOff, Clock, CheckCircle, Keyboard } from "lucide-react";
import Link from 'next/link';
import { getPendingKDSOrdersAction, markOrderReadyAction } from "./actions";

// Sintetizador de sonido industrial para la cocina
function createBellPlayer() {
  let ctx: AudioContext | null = null;
  return {
    async enable() {
      if (typeof window === "undefined") return;
      if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
    },
    async play() {
      if (typeof window === "undefined") return;
      if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") return;

      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(250, now);
      hp.connect(out);
      out.connect(ctx.destination);
      
      const freqs = [
        { f: 740, d: 1.1 },
        { f: 932, d: 1.25 },
        { f: 1175, d: 1.35 },
        { f: 1480, d: 1.45 },
      ];
      
      for (const p of freqs) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(p.f, now);
        o.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + p.d);
        o.connect(g);
        g.connect(hp);
        o.start(now);
        o.stop(now + p.d);
      }
    },
  };
}

export default function KitchenDisplaySystem() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States adicionales y mejoras
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"tickets" | "summary">("tickets");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [crossedItems, setCrossedItems] = useState<Set<string>>(new Set());
  
  const knownOrdersRef = useRef<Set<string>>(new Set());
  const bell = useMemo(() => createBellPlayer(), []);

  const fetchOrders = async () => {
    try {
      const res = await getPendingKDSOrdersAction();
      if (res.success && res.orders) {
        setOrders(res.orders);

        // Sound Engine: Detectar si hay pedidos nuevos
        if (soundEnabled) {
          const fetchedIds = new Set(res.orders.map((o: any) => o.id));
          let hasNew = false;
          fetchedIds.forEach(id => {
             if (!knownOrdersRef.current.has(id as string)) {
                hasNew = true;
             }
          });
          if (hasNew) {
            bell.play();
          }
          knownOrdersRef.current = fetchedIds;
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    // Optimistic UI update
    setOrders(prev => prev.filter(o => o.id !== orderId));
    knownOrdersRef.current.delete(orderId);
    await markOrderReadyAction(orderId);
  };

  const toggleCrossItem = (orderId: string, itemId: string) => {
    setCrossedItems(prev => {
      const next = new Set(prev);
      const key = `${orderId}-${itemId}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSound = async () => {
    if (!soundEnabled) {
      await bell.enable();
      bell.play(); // Test feedback
    }
    setSoundEnabled(!soundEnabled);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error full-screen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const [sysTime, setSysTime] = useState<string>("");

  useEffect(() => {
    // Reloj Global para que el cocinero sepa la hora en todo momento
    const tick = setInterval(() => {
      setSysTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Bump bar event listener (Keys 1-9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       // Ignore if focus is in an input (not likely in KDS but safe)
       if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

       const keyNumber = parseInt(e.key);
       if (!isNaN(keyNumber) && keyNumber >= 1 && keyNumber <= 9) {
          const orderIndex = keyNumber - 1;
          if (orders[orderIndex]) {
             handleMarkReady(orders[orderIndex].id);
          }
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orders]); // Rebind when orders change so index maps correctly

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Polling real-time cada 10s
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Agrupar elementos para la vista Consolidada (Agrupando por Producto Base Primero)
  const summaryData = useMemo(() => {
    // Map base product name -> total quantity and list of specific customizations
    const map = new Map<string, { name: string, totalQuantity: number, customVariants: Map<string, number> }>();
    
    orders.forEach(order => {
       order.items?.forEach((item: any) => {
          const baseName = item.productNameSnapshot || "Producto sin nombre";
          const qty = item.quantity || 1;
          
          let modString = "Estándar";
          if (item.modifiers && item.modifiers.length > 0) {
             // Ordenar para que "- Queso | - Bacon" sea igual a "- Bacon | - Queso" si importara (aunque el array suele venir en el mismo orden)
             modString = item.modifiers.map((m: any) => m.modifierNameSnapshot).join(", ");
          }
          if (item.notes) {
             modString += ` (Nota: ${item.notes})`;
          }

          if (!map.has(baseName)) {
             map.set(baseName, { name: baseName, totalQuantity: 0, customVariants: new Map() });
          }
          
          const productData = map.get(baseName)!;
          productData.totalQuantity += qty;
          
          const currentVariantCount = productData.customVariants.get(modString) || 0;
          productData.customVariants.set(modString, currentVariantCount + qty);
       });
    });
    
    return Array.from(map.values()).map(p => ({
      name: p.name,
      totalQuantity: p.totalQuantity,
      variants: Array.from(p.customVariants.entries()).map(([mods, count]) => ({ mods, count }))
    })).sort((a,b) => b.totalQuantity - a.totalQuantity);
  }, [orders]);

  // Ritmo Promedio de la Cola Actual
  const avgPace = useMemo(() => {
    if (orders.length === 0) return 0;
    const now = Date.now();
    const sum = orders.reduce((acc, order) => {
      return acc + (now - new Date(order.createdAt).getTime());
    }, 0);
    return Math.floor(sum / orders.length / 60000);
  }, [orders]);

  return (
    <div style={{
      backgroundColor: '#000',
      minHeight: '100vh',
      color: '#fff',
      padding: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* CSS Animaciones Globales Premium */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes urgentPulse {
           0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
           70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
           100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes cleanKitchenFloat {
           0%, 100% { transform: translateY(0px); }
           50% { transform: translateY(-10px); }
        }
      `}} />

      {/* HEADER TOP */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid #222',
        marginBottom: '2rem'
      }}>
        {/* LOGO & CLOCK & MODE TOGGLE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '2.4rem', margin: 0, fontWeight: 900, color: '#f97316', letterSpacing: '-1px' }}>KDS <span style={{ color: '#444', fontSize: '1.6rem' }}>PRO</span></h1>
            <div style={{ background: '#ef4444', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: 12, fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>
              {orders.length} PENDIENTES
            </div>
            
            {/* Ritmo Promedio Metric */}
            {orders.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.05)', color: '#a8a29e', padding: '0.4rem 1rem', borderRadius: 99, fontWeight: 600, fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.1)', marginLeft: '0.5rem' }}>
                ⚡ Ritmo: {avgPace} min
              </div>
            )}
          </div>

          <div style={{ display: 'flex', background: '#222', padding: '0.4rem', borderRadius: '12px', gap: '0.4rem' }}>
            <button onClick={() => setViewMode("tickets")} style={{
               background: viewMode === "tickets" ? '#444' : 'transparent',
               border: 'none', color: viewMode === "tickets" ? '#fff' : '#888',
               padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
               display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold'
            }}>
               <LayoutList size={18} /> Por Tickets
            </button>
            <button onClick={() => setViewMode("summary")} style={{
               background: viewMode === "summary" ? '#f97316' : 'transparent',
               border: 'none', color: viewMode === "summary" ? '#fff' : '#888',
               padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
               display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold'
            }}>
               <Layers size={18} /> Consolidado
            </button>
          </div>
        </div>
        
        {/* ACTIONS & CLOCK */}
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
           {/* Global Kitchen Clock */}
           <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginRight: '1rem', fontVariantNumeric: 'tabular-nums' }}>
             {sysTime}
           </div>

           <button onClick={toggleSound} style={{
            background: soundEnabled ? 'rgba(34, 197, 94, 0.2)' : '#2a2a2a', 
            border: `1px solid ${soundEnabled ? 'rgba(34, 197, 94, 0.4)' : '#333'}`,
            color: soundEnabled ? '#22c55e' : '#888', padding: '0.8rem 1rem',
            borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            {soundEnabled ? <Bell size={20} /> : <BellOff size={20} />} 
          </button>
          <button onClick={toggleFullscreen} style={{
            background: '#333', border: 'none', color: '#fff', padding: '0.8rem 1.2rem',
            borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <Maximize size={20} /> Pantalla
          </button>
          <Link href="/" style={{
            background: '#222', border: 'none', color: '#fff', padding: '0.8rem 1.5rem',
            borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            Salir
          </Link>
        </div>
      </header>

      {/* CONTENT: TICKETS MODE */}
      {viewMode === "tickets" && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a8a29e', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <Keyboard size={16} /> <strong>Atajos de Teclado Activos:</strong> Pulsa los números (1 al 9) en tu teclado físico para marcar los tickets como "Listos" sin tocar la pantalla. Toca individualmente los productos para tacharlos.
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1', color: '#666', fontSize: '1.2rem' }}>Cargando comandas desde la base de datos...</div>
            ) : orders.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: '5rem', animation: 'cleanKitchenFloat 3s ease-in-out infinite' }}>🎉</div>
                 <div style={{ color: '#555', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>¡COCINA LIMPIA!</div>
                 <div style={{ color: '#444', fontSize: '1.2rem' }}>Todo bajo control. Esperando nuevas comandas.</div>
              </div>
            ) : orders.map((order, idx) => {
              
              const orderDate = new Date(order.createdAt);
              const diffMs = Date.now() - orderDate.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              
              const isUrgent = diffMins >= 25;
              const isWarning = diffMins >= 15;

              return (
                <div key={order.id} style={{
                  background: '#111',
                  border: `2px solid ${isUrgent ? '#ef4444' : isWarning ? '#eab308' : '#333'}`,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: isUrgent ? 'urgentPulse 2s infinite' : 'none',
                  boxShadow: isUrgent ? '0 0 15px rgba(239,68,68,0.2)' : '0 8px 30px rgba(0,0,0,0.5)',
                  transition: 'all 0.3s ease'
                }}>
                  {/* TICKET HEADER */}
                  <div style={{
                    background: isUrgent ? '#ef4444' : isWarning ? '#eab308' : '#222',
                    padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: isWarning && !isUrgent ? '#000' : '#fff'
                  }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>
                      <span style={{ fontSize: '1rem', opacity: 0.8, fontWeight: 700 }}>TECLA {idx + 1}</span><br />
                      #{String(order.orderNumber).padStart(4, "0")}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 900, fontSize: '1.4rem' }}>
                      <Clock size={24} /> {diffMins} min
                    </span>
                  </div>
                  
                  {/* TICKET BODY */}
                  <div style={{ padding: '1rem', flex: 1 }}>
                    <div style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '2px solid #333', fontSize: '1.1rem', color: '#ccc', fontWeight: 800 }}>
                      <span style={{ color: order.isDelivery ? '#3b82f6' : '#22c55e' }}>{order.isDelivery ? "DOMICILIO" : "ENTREGA LOCAL"}</span> | {order.customerName || 'Invitado'}
                      {order.isDelivery && order.deliveryAddress && (
                        <div style={{ fontSize: '0.9rem', color: '#a8a29e', fontWeight: 500, marginTop: '0.4rem', borderLeft: '2px solid #3b82f6', paddingLeft: '0.5rem' }}>
                          📍 {order.deliveryAddress}
                        </div>
                      )}
                    </div>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '1.3rem', lineHeight: '1.6' }}>
                      {order.items?.map((item: any) => {
                        const isCrossed = crossedItems.has(`${order.id}-${item.id}`);
                        
                        return (
                          <li 
                            key={item.id} 
                            onClick={() => toggleCrossItem(order.id, item.id)}
                            style={{ 
                              borderBottom: '1px solid #222', padding: '0.8rem 0', cursor: 'pointer',
                              textDecoration: isCrossed ? 'line-through' : 'none',
                              opacity: isCrossed ? 0.3 : 1, transition: 'all 0.2s'
                            }}
                          >
                            <span style={{ color: '#f97316', fontWeight: 900, marginRight: '0.5rem' }}>{item.quantity || 1}x</span> 
                            <span style={{ fontWeight: 700 }}>{item.productNameSnapshot}</span>
                            
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div style={{ fontSize: '1.1rem', color: '#999', paddingLeft: '2.5rem', fontWeight: 600 }}>
                                {item.modifiers.map((m: any) => (
                                  <div key={m.id}>- {m.modifierNameSnapshot}</div>
                                ))}
                              </div>
                            )}
                            
                            {item.notes && (
                              <div style={{ fontSize: '1.1rem', color: '#ef4444', paddingLeft: '2.5rem', fontWeight: 900, marginTop: '0.5rem' }}>⚠️ NOTA: {item.notes}</div>
                            )}
                          </li>
                        )
                      })}
                    </ul>

                    {order.notes && (
                      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '2px dashed rgba(239, 68, 68, 0.5)', borderRadius: '8px', color: '#fca5a5', fontSize: '1.1rem', fontWeight: 800 }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>NOTA PEDIDO:</strong> {order.notes}
                      </div>
                    )}
                  </div>

                  {/* TICKET FOOTER */}
                  <button 
                    onClick={() => handleMarkReady(order.id)}
                    style={{
                      background: '#22c55e', border: 'none', padding: '1.5rem', color: '#000',
                      fontSize: '1.5rem', fontWeight: 900, cursor: 'pointer', display: 'flex',
                      justifyContent: 'center', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase'
                  }}>
                    <CheckCircle size={32} /> Listo (Tecla {idx + 1})
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* CONTENT: SUMMARY MODE */}
      {viewMode === "summary" && (
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#111', borderRadius: '16px', border: '2px solid #333', padding: '2rem' }}>
          <h2 style={{ fontSize: '2rem', color: '#fafaf9', margin: '0 0 2rem 0', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={32} color="#f97316" /> Visión Consolidada
          </h2>
          
          {summaryData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', fontSize: '1.5rem', padding: '3rem' }}>No hay platos en la cola.</div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {summaryData.map((s, idx) => (
                   <div key={idx} style={{ 
                      display: 'flex', flexDirection: 'column', gap: '1rem',
                      background: '#1a1a1a', padding: '1.5rem', borderRadius: '16px',
                      border: '1px solid #333'
                   }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fafaf9' }}>{s.name}</div>
                         <div style={{ 
                            background: '#f97316', color: '#000', fontSize: '2.5rem', width: '80px', height: '80px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 900,
                            boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)'
                         }}>
                            {s.totalQuantity}
                         </div>
                      </div>
                      
                      {/* Desglose de personalizaciones */}
                      {s.variants.length > 0 && (
                        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '12px' }}>
                          <div style={{ fontSize: '1rem', color: '#888', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase' }}>Desglose de Preparación:</div>
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {s.variants.map((v, i) => (
                              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem', paddingBottom: '0.5rem', borderBottom: i !== s.variants.length - 1 ? '1px dashed #333' : 'none' }}>
                                <span style={{ color: v.mods === "Estándar" ? '#a8a29e' : '#fbbf24', fontWeight: v.mods === "Estándar" ? 500 : 700 }}>
                                  {v.mods === "Estándar" ? "Sin modificar (Recepta Original)" : `Personalizado: ${v.mods}`}
                                </span>
                                <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.4rem', background: '#333', padding: '0.2rem 0.8rem', borderRadius: '8px' }}>
                                  {v.count}x
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                   </div>
                ))}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
