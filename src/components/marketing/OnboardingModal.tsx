"use client";

import React, { useState, useTransition } from "react";
import { X, ArrowRight, Loader2, CheckCircle2, TrendingUp, Store } from "lucide-react";
import styles from "./onboarding.module.css";
import { registerRestaurantAction } from "@/app/(auth)/actions";
import { signIn } from "next-auth/react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<{message: string} | null>(null);

  // Form State
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleNextStep = () => {
    setError(null);
    if (step === 2) {
      if (!restaurantName.trim() || !slug.trim()) {
        setError({ message: "Por favor, completa los datos de tu restaurante." });
        return;
      }
      // Simple slug validation (alphanumeric and dashes only)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        setError({ message: "El enlace solo puede contener minúsculas, números y guiones." });
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => setStep((prev) => prev - 1);

  const generateSlug = (name: string) => {
    const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    return s;
  };

  const onSubmit = () => {
    setError(null);
    if (!ownerName.trim() || !email.trim() || !password.trim()) {
      setError({ message: "Por favor, completa tus datos de acceso." });
      return;
    }
    if (password.length < 6) {
      setError({ message: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    startTransition(async () => {
      const res = await registerRestaurantAction({
        restaurantName,
        slug,
        ownerName,
        email,
        password
      });

      if (res?.error) {
        setError({ message: res.error });
      } else if (res?.success) {
        // Auto-login and redirect
        const loginRes = await signIn("credentials", {
          redirect: false,
          email,
          password
        });
        
        if (loginRes?.error) {
           setError({ message: "Registro exitoso, pero falló el auto-login. Por favor, ve a /login" });
        } else {
           window.location.href = "/dashboard";
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <button onClick={onClose} className={styles.closeBtn} disabled={isPending}>
          <X size={20} />
        </button>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        <div className={styles.modalContent}>
          {errorObj && (
            <div className={styles.errorBox}>
              {errorObj.message}
            </div>
          )}

          {step === 1 && (
             <div className={styles.stepBox}>
                <div className={styles.iconCircle}><TrendingUp size={32} color="#22c55e" /></div>
                <h2 className={styles.stepTitle}>Estás a un click de ganar más.</h2>
                <p className={styles.stepSubtitle}>
                   Crear tu cuenta toma menos de 1 minuto. Configura tu carta interactiva y empieza a recibir pedidos sin pagar comisiones desde hoy mismo.
                </p>
                <div className={styles.benefitsList}>
                   <div className={styles.benefitItem}><CheckCircle2 size={16} color="#22c55e"/> 0% Comisiones por pedido</div>
                   <div className={styles.benefitItem}><CheckCircle2 size={16} color="#22c55e"/> Carta QR Interactiva con Pagos</div>
                   <div className={styles.benefitItem}><CheckCircle2 size={16} color="#22c55e"/> Pantalla de Cocina (KDS)</div>
                </div>
                <button className={styles.primaryBtn} onClick={handleNextStep}>
                   Ir al paso 2 <ArrowRight size={18} />
                </button>
             </div>
          )}

          {step === 2 && (
             <div className={styles.stepBox}>
                <div className={styles.iconCircle}><Store size={32} color="#f97316" /></div>
                <h2 className={styles.stepTitle}>Datos de tu local</h2>
                <p className={styles.stepSubtitle}>
                   Elige un nombre y la URL pública donde tus clientes verán tu carta y harán pedidos.
                </p>
                
                <div className={styles.inputGroup}>
                   <label>Nombre del Restaurante *</label>
                   <input 
                     type="text" 
                     placeholder="Ej: Pizzería Roma" 
                     value={restaurantName}
                     onChange={(e) => {
                       const nextValue = e.target.value;
                       setRestaurantName(nextValue);
                       // Auto-update slug if it was empty or matched the previous auto-generated slug
                       if(!slug || slug === generateSlug(restaurantName)) {
                         setSlug(generateSlug(nextValue));
                       }
                     }}
                     className={styles.inputField}
                     autoFocus
                   />
                </div>

                <div className={styles.inputGroup}>
                   <label>Enlace público (Slug) *</label>
                   <div className={styles.slugInputWrapper}>
                     <span className={styles.slugPrefix}>zapieat.com/</span>
                     <input 
                       type="text" 
                       value={slug}
                       onChange={(e) => setSlug(e.target.value)}
                       className={styles.slugInputField}
                     />
                   </div>
                   <p className={styles.inputHint}>Tus clientes escanearán el QR que llevará a este enlace.</p>
                </div>

                <div className={styles.btnRow}>
                   <button className={styles.secondaryBtn} onClick={handlePrevStep}>Atrás</button>
                   <button className={styles.primaryBtn} onClick={handleNextStep}>Continuar <ArrowRight size={18} /></button>
                </div>
             </div>
          )}

          {step === 3 && (
             <div className={styles.stepBox}>
                <h2 className={styles.stepTitle}>Tus accesos</h2>
                <p className={styles.stepSubtitle}>
                   Crea tu usuario administrador. Con él podrás acceder al ZapiDashboard y gestionar todo tu restaurante.
                </p>
                
                <div className={styles.inputGroup}>
                   <label>Tu Nombre *</label>
                   <input 
                     type="text" 
                     placeholder="Ej: Carlos Gómez" 
                     value={ownerName}
                     onChange={(e) => setOwnerName(e.target.value)}
                     className={styles.inputField}
                     disabled={isPending}
                     autoFocus
                   />
                </div>

                <div className={styles.inputGroup}>
                   <label>Email de acceso *</label>
                   <input 
                     type="email" 
                     placeholder="tu@email.com" 
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className={styles.inputField}
                     disabled={isPending}
                   />
                </div>

                <div className={styles.inputGroup}>
                   <label>Contraseña *</label>
                   <input 
                     type="password" 
                     placeholder="Mínimo 6 caracteres" 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className={styles.inputField}
                     disabled={isPending}
                   />
                </div>

                <div className={styles.btnRow}>
                   <button className={styles.secondaryBtn} onClick={handlePrevStep} disabled={isPending}>Atrás</button>
                   <button className={styles.submitBtn} onClick={onSubmit} disabled={isPending}>
                      {isPending ? (
                        <><Loader2 size={18} className={styles.spinner} /> Creando tu tienda...</>
                      ) : (
                        <><CheckCircle2 size={18} /> ¡Empezar a usar ZapiEat!</>
                      )}
                   </button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
