"use client";

import React, { useState, useTransition } from "react";
import { X, Check } from "lucide-react";
import styles from "./modal.module.css";
import { updateCategoryAction } from "./actions";
import { Portal } from "@/components/ui/Portal";

interface EditCategoryModalProps {
  category: { id: string; name: string; description?: string | null };
  onClose: () => void;
}

export function EditCategoryModal({ category, onClose }: EditCategoryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await updateCategoryAction(category.id, name, description);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <Portal>
      <div className={styles.overlay} onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
        <div className={styles.modal} style={{ maxWidth: '450px' }}>
          <div className={styles.header}>
            <h3 className={styles.title}>Editar Categoría</h3>
            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.form} style={{ padding: '1.5rem' }}>
              {error && <div className={styles.errorAlert}>{error}</div>}
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>Nombre de la Categoría *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  className={styles.input}
                  disabled={isPending}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Descripción</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className={styles.textarea}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isPending}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnSubmit} disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
