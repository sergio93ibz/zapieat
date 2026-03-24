"use client";

import React, { useState } from 'react';
import { UserCircle, LogOut } from 'lucide-react';
import { CustomerAuthModal } from '@/components/storefront/CustomerAuthModal';
import { CustomerAccountPanel } from '@/components/storefront/CustomerAccountPanel';

export function StorefrontHeaderActions({ 
  restaurantId, 
  customerId,
  isLoggedIn, 
  loyaltyPoints,
  loyaltySettings,
}: { 
  restaurantId: string;
  customerId?: string;
  isLoggedIn: boolean;
  loyaltyPoints: number;
  loyaltySettings?: {
    enabled: boolean;
    pointsValue: number;
    minPoints: number;
    pointsPerEuro: number;
  };
}) {
  const [showAuth, setShowAuth] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#22c55e', color: '#000', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem' }}>
         <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#000' }}></div>
         Abierto ahora
      </div>

      {isLoggedIn && customerId ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           {loyaltySettings?.enabled && (
             <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', color: '#f97316', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                ⭐ {loyaltyPoints}
              </div>
            )}
            <button
              onClick={() => setShowAccount(true)}
              style={{ background: '#f97316', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}
            >
              <UserCircle size={18} /> Mi Cuenta
            </button>
        </div>
      ) : (
        <button 
          onClick={() => setShowAuth(true)}
          style={{ background: '#f97316', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}
        >
           <UserCircle size={18} /> Acceder
        </button>
      )}

      {showAuth && (
        <CustomerAuthModal 
          restaurantId={restaurantId} 
          onClose={() => setShowAuth(false)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {showAccount && customerId && (
        <CustomerAccountPanel
          customerId={customerId}
          onClose={() => setShowAccount(false)}
          loyaltySettings={loyaltySettings}
        />
      )}
    </div>
  );
}
