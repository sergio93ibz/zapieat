"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { requestCustomerOtpAction, verifyCustomerOtpAction } from '@/app/[slug]/customerActions';
import { X, Lock, Phone } from 'lucide-react';

const PREFIXES = [
  { code: "+34", label: "España (+34)" },
  { code: "+52", label: "México (+52)" },
  { code: "+1",  label: "USA/Canadá (+1)" },
  { code: "+44", label: "Reino Unido (+44)" },
  { code: "+54", label: "Argentina (+54)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+56", label: "Chile (+56)" },
];

export function CustomerAuthModal({ 
  restaurantId, 
  onClose,
  onSuccess
}: { 
  restaurantId: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [prefix, setPrefix] = useState("+34");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    setError("");
    setLoading(true);

    const fullPhone = `${prefix} ${phone}`;
    const res = await requestCustomerOtpAction(restaurantId, fullPhone);
    setLoading(false);
    
    if (res.error) {
       setError(res.error);
    } else {
       setStep("code"); // Code requested
       if (process.env.NODE_ENV !== "production") {
         alert("En Desarrollo el SMS simulado es: 0000");
       }
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    setError("");
    setLoading(true);

    const fullPhone = `${prefix} ${phone}`;
    const res = await verifyCustomerOtpAction(restaurantId, fullPhone, code);
    setLoading(false);
    
    if (res.error) {
       setError(res.error);
    } else {
       if (onSuccess) onSuccess(); // Reloads page or sets contextual state
       else window.location.reload();
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
       <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '400px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#888' }}>
             <X size={24} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
             <div style={{ background: '#f97316', width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Lock size={30} />
             </div>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', margin: 0 }}>Acceso de Clientes</h2>
             <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {step === "phone" ? "Añade tu número para acumular puntos y ver tus pedidos." : "Introduce el código SMS que te hemos enviado."}
             </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {step === "phone" && (
            <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
                  <select 
                     value={prefix} 
                     onChange={(e) => setPrefix(e.target.value)}
                     style={{ padding: '1rem', borderRadius: '8px', border: '2px solid #eee', fontSize: '1rem', outline: 'none', background: '#fff', cursor: 'pointer' }}
                  >
                     {PREFIXES.map(p => (
                        <option key={p.code} value={p.code}>{p.label}</option>
                     ))}
                  </select>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Phone size={18} color="#888" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                    <input 
                      type="tel"
                      placeholder="Ej: 600123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '8px', border: '2px solid #eee', fontSize: '1rem', outline: 'none' }}
                    />
                  </div>
               </div>
               <button type="submit" disabled={loading} style={{ background: '#111', color: '#fff', padding: '1rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 800, border: 'none', cursor: loading ? 'wait' : 'pointer' }}>
                  {loading ? "Enviando SMS..." : "Recibir código PIN"}
               </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <input 
                 type="text"
                 placeholder="Ej: 0000"
                 value={code}
                 onChange={(e) => setCode(e.target.value)}
                 required
                 maxLength={4}
                 style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '2px solid #eee', fontSize: '1.5rem', outline: 'none', textAlign: 'center', letterSpacing: '4px', fontWeight: 800 }}
               />
               <button type="submit" disabled={loading} style={{ background: '#f97316', color: '#fff', padding: '1rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 800, border: 'none', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)' }}>
                  {loading ? "Verificando..." : "Acceder"}
               </button>
               <button type="button" onClick={() => { setStep("phone"); setCode(""); }} style={{ background: 'transparent', border: 'none', color: '#888', fontWeight: 600, marginTop: '0.5rem', cursor: 'pointer' }}>
                  Usar otro número
               </button>
            </form>
          )}
       </div>
    </div>,
    document.body
  )
}
