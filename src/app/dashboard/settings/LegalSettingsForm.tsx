"use client"

import React, { useTransition, useState } from "react"
import styles from "./settings.module.css"
import { updateLegalSettingsAction } from "./actions"
import { CheckCircle2, ShieldCheck, FileText, Lock, Cookie } from "lucide-react"

export function LegalSettingsForm({ initialData }: { initialData: any }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: 'error'|'success', message: string } | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      setStatus(null)
      const res = await updateLegalSettingsAction(formData)
      if (res?.error) {
        setStatus({ type: 'error', message: res.error })
      } else {
        setStatus({ type: 'success', message: "Textos legales guardados correctamente." })
        setTimeout(() => setStatus(null), 3000)
      }
    })
  }

  return (
    <form className={styles.section} onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ background: '#f97316', color: '#fff', padding: '0.5rem', borderRadius: '10px' }}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Textos Legales y Políticas</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Configura los textos que aparecerán en el pie de página de tu web.</p>
        </div>
      </div>
      
      {status?.type === 'success' && (
        <div className={styles.successMessage}>
          <CheckCircle2 size={18} />
          {status.message}
        </div>
      )}
      {status?.type === 'error' && (
        <div style={{color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem'}}>
          {status.message}
        </div>
      )}

      <div className={styles.formGrid}>
        <div className={styles.formGroupFull}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FileText size={16} color="#64748b" />
            <label htmlFor="legalNotice" className={styles.label} style={{ margin: 0 }}>Aviso Legal</label>
          </div>
          <textarea 
            id="legalNotice" 
            name="legalNotice" 
            className={styles.textarea} 
            style={{ minHeight: '150px' }}
            defaultValue={initialData?.legalNotice || ''} 
            disabled={isPending}
            placeholder="Introduce aquí la información legal de tu empresa..."
          />
        </div>

        <div className={styles.formGroupFull}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Lock size={16} color="#64748b" />
            <label htmlFor="privacyPolicy" className={styles.label} style={{ margin: 0 }}>Política de Privacidad</label>
          </div>
          <textarea 
            id="privacyPolicy" 
            name="privacyPolicy" 
            className={styles.textarea} 
            style={{ minHeight: '150px' }}
            defaultValue={initialData?.privacyPolicy || ''} 
            disabled={isPending}
            placeholder="Explica cómo tratas los datos de tus clientes..."
          />
        </div>

        <div className={styles.formGroupFull}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Cookie size={16} color="#64748b" />
            <label htmlFor="cookiesPolicy" className={styles.label} style={{ margin: 0 }}>Política de Cookies</label>
          </div>
          <textarea 
            id="cookiesPolicy" 
            name="cookiesPolicy" 
            className={styles.textarea} 
            style={{ minHeight: '150px' }}
            defaultValue={initialData?.cookiesPolicy || ''} 
            disabled={isPending}
            placeholder="Detalla las cookies que utiliza tu sitio web..."
          />
        </div>

        <div className={styles.formGroupFull}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FileText size={16} color="#64748b" />
            <label htmlFor="termsConditions" className={styles.label} style={{ margin: 0 }}>Términos y Condiciones</label>
          </div>
          <textarea 
            id="termsConditions" 
            name="termsConditions" 
            className={styles.textarea} 
            style={{ minHeight: '150px' }}
            defaultValue={initialData?.termsConditions || ''} 
            disabled={isPending}
            placeholder="Condiciones de venta, devoluciones, envíos..."
          />
        </div>
      </div>

      <div className={styles.footer}>
        <button type="submit" className={styles.btnSave} disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar Textos Legales"}
        </button>
      </div>
    </form>
  )
}
