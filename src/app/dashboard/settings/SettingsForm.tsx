"use client"

import React, { useTransition, useState } from "react"
import styles from "./settings.module.css"
import { updateRestaurantSettingsAction } from "./actions"
import { CheckCircle2 } from "lucide-react"

export function SettingsForm({ initialData }: { initialData: any }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: 'error'|'success', message: string } | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      setStatus(null)
      const res = await updateRestaurantSettingsAction(null, formData)
      if (res?.error) {
        setStatus({ type: 'error', message: res.error })
      } else {
        setStatus({ type: 'success', message: "Configuración guardada correctamente." })
        setTimeout(() => setStatus(null), 3000)
      }
    })
  }

  return (
    <form className={styles.section} onSubmit={handleSubmit}>
      <h3 className={styles.sectionTitle}>Perfil del Local</h3>
      
      {status?.type === 'success' && (
        <div className={styles.successMessage}>
          <CheckCircle2 size={18} />
          {status.message}
        </div>
      )}
      {status?.type === 'error' && (
        <div style={{color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem'}}>
          {status.message}
        </div>
      )}

      <div className={styles.formGrid}>
        <div className={styles.formGroupFull}>
          <label htmlFor="name" className={styles.label}>Nombre del Restaurante</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            className={styles.input} 
            defaultValue={initialData?.name || ''} 
            disabled={isPending}
            required
          />
        </div>

        <div className={styles.formGroupFull}>
          <label htmlFor="description" className={styles.label}>Descripción o Slogan</label>
          <textarea 
            id="description" 
            name="description" 
            className={styles.textarea} 
            defaultValue={initialData?.description || ''} 
            disabled={isPending}
            placeholder="La mejor pizzería napolitana de la ciudad..."
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>Teléfono</label>
          <input 
            type="tel" 
            id="phone" 
            name="phone" 
            className={styles.input} 
            defaultValue={initialData?.phone || ''}
            disabled={isPending}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="city" className={styles.label}>Ciudad</label>
          <input 
            type="text" 
            id="city" 
            name="city" 
            className={styles.input} 
            defaultValue={initialData?.city || ''}
            disabled={isPending}
          />
        </div>

        <div className={styles.formGroupFull}>
          <label htmlFor="address" className={styles.label}>Dirección Completa</label>
          <input 
            type="text" 
            id="address" 
            name="address" 
            className={styles.input} 
            defaultValue={initialData?.address || ''}
            disabled={isPending}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <button type="submit" className={styles.btnSave} disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  )
}
