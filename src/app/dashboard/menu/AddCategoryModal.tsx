"use client";

import React, { useState, useTransition } from "react";
import { Layers, X } from "lucide-react";
import styles from "./modal.module.css";
import parentStyles from "./menu.module.css";
import { createCategoryAction } from "./actions";

export function AddCategoryModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<{ error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      setError(null);
      const result = await createCategoryAction(formData);
      if (result?.error) {
        setError({ error: result.error });
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button 
        className={parentStyles.btnPrimary} 
        style={{ backgroundColor: "#292524", color: "#e7e5e4" }}
        onClick={() => setIsOpen(true)}
      >
        <Layers size={16} />
        Nueva Categoría
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false);
        }}>
          <div className={styles.modal}>
            <div className={styles.header}>
              <h3 className={styles.title}>Nueva Categoría</h3>
              <button 
                className={styles.closeBtn} 
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.formContainer}>
              <div className={styles.form}>
                
                {errorObj?.error && (
                  <div className={styles.errorAlert}>{errorObj.error}</div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="name" className={styles.label}>Nombre de la Categoría *</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    required 
                    className={styles.input} 
                    placeholder="Ej. Bebidas Calientes"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="description" className={styles.label}>Descripción</label>
                  <textarea 
                    id="description" 
                    name="description" 
                    className={styles.textarea} 
                    placeholder="Escribe algo sobre estos productos..."
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className={styles.footer}>
                <button 
                  type="button" 
                  className={styles.btnCancel} 
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={isPending}>
                  {isPending ? "Guardando..." : "Crear Categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
