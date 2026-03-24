"use client";

import React, { useState } from 'react';
import { PauseCircle, PlayCircle, Clock } from 'lucide-react';
import { toggleRestaurantPauseAction } from '@/app/dashboard/actions';

interface SmartPauseButtonProps {
  initialIsPaused: boolean;
  initialPausedUntil?: Date | null;
}

export function SmartPauseButton({ initialIsPaused, initialPausedUntil }: SmartPauseButtonProps) {
  const [isPaused, setIsPaused] = useState(initialIsPaused);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Consider it paused if isPaused is true OR pausedUntil is in the future
  const currentlyPaused = isPaused || (initialPausedUntil && new Date(initialPausedUntil) > new Date());

  const handlePause = async (minutes?: number) => {
    setLoading(true);
    setShowOptions(false);
    const newStatus = minutes ? true : false; // if minutes provided -> true. if not -> resume
    
    const res = await toggleRestaurantPauseAction(newStatus, minutes);
    
    setLoading(false);
    if (res?.success) {
      setIsPaused(newStatus);
      if (!newStatus) {
        // Force refresh to update time properly if resumed early
        window.location.reload(); 
      }
    } else {
      alert("Error actualizando el estado de la cocina");
    }
  };

  if (currentlyPaused) {
    return (
      <button 
        onClick={() => handlePause()} 
        disabled={loading}
        title="Reanudar recepción de pedidos"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
          border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 1rem', 
          borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          animation: 'pulse 2s infinite'
        }}
      >
        <PlayCircle size={18} />
        {loading ? "Reanudando..." : "Cocina Pausada (Click para Reanudar)"}
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setShowOptions(!showOptions)}
        title="Pausar temporalmente los pedidos online"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', 
          border: '1px solid rgba(249, 115, 22, 0.3)', padding: '0.5rem 1rem', 
          borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <PauseCircle size={18} />
        Botón Anti-Colapso
      </button>

      {showOptions && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          backgroundColor: '#1c1917', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', padding: '1rem', width: '220px', zIndex: 100,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#a8a29e', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={16} /> Pausar envíos por:
          </h4>
          {[
            { label: 'Corto aliento (15 min)', min: 15 },
            { label: 'Cocina saturada (30 min)', min: 30 },
            { label: '¡Caos total! (60 min)', min: 60 },
          ].map(opt => (
            <button 
              key={opt.min}
              onClick={() => handlePause(opt.min)}
              disabled={loading}
              style={{
                width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', 
                backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', 
                borderRadius: '6px', color: '#fafaf9', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
