"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, Image as ImageIcon } from "lucide-react";
import styles from "./modal.module.css";
import parentStyles from "./menu.module.css";
import { createProductAction } from "./actions";
import { Portal } from "@/components/ui/Portal";

interface Category {
  id: string;
  name: string;
}

interface AddProductModalProps {
  categories: Category[];
}

export function AddProductModal({ categories }: AddProductModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<{ error?: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      setError(null);
      const result = await createProductAction(null, formData);
      if (result?.error) {
        setError({ error: result.error });
      } else {
        setIsOpen(false);
        setPreviewUrl(null);
      }
    });
  };

  return (
    <>
      <button 
        className={parentStyles.btnPrimary} 
        onClick={() => setIsOpen(true)}
      >
        <Plus size={16} />
        Añadir Producto
      </button>

      {isOpen && (
        <Portal>
          <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}>
            <div className={styles.modal}>
              <div className={styles.header}>
                <h3 className={styles.title}>Nuevo Producto</h3>
                <button 
                  className={styles.closeBtn} 
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className={styles.formContainer} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className={styles.form} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                  
                  {errorObj?.error && (
                    <div className={styles.errorAlert}>{errorObj.error}</div>
                  )}

                  <div className={styles.imageUploadContainer}>
                    <label className={styles.label}>Imagen del Producto</label>
                    <div 
                      className={styles.imagePlaceholder} 
                      onClick={() => document.getElementById('productImageInput')?.click()}
                      style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                    >
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt="Preview" className={styles.imagePreview} />
                          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>Cambiar imagen</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <ImageIcon size={32} />
                          <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Haz click para subir una foto</span>
                        </div>
                      )}
                      
                      {isPending && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <div style={{ width: '20px', height: '20px', border: '2px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        </div>
                      )}
                    </div>
                    
                    <input
                      id="productImageInput"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const formData = new FormData();
                        formData.append("file", file);

                        try {
                          const res = await fetch("/api/upload", {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();
                          if (data.url) {
                            setPreviewUrl(data.url);
                          } else {
                            setError({ error: data.error || "Fallo al subir la imagen" });
                          }
                        } catch (err) {
                          setError({ error: "No se pudo conectar con el servidor" });
                        }
                      }}
                    />
                    
                    <input
                      type="hidden"
                      name="imageUrl"
                      value={previewUrl ?? ""}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="name" className={styles.label}>Nombre del Producto *</label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      required 
                      className={styles.input} 
                      placeholder="Ej. Hamburguesa Doble Queso"
                      disabled={isPending}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="categoryId" className={styles.label}>Categoría *</label>
                    <select 
                      id="categoryId" 
                      name="categoryId" 
                      required 
                      className={styles.select}
                      disabled={isPending}
                    >
                      <option value="">Selecciona una categoría...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label htmlFor="price" className={styles.label}>Precio (€) *</label>
                      <input 
                        type="number" 
                        id="price" 
                        name="price" 
                        step="0.01" 
                        min="0"
                        required 
                        className={styles.input} 
                        placeholder="Ej. 12.50"
                        disabled={isPending}
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label htmlFor="preparationTimeMinutes" className={styles.label}>T. Preparación (Min)</label>
                      <input 
                        type="number" 
                        id="preparationTimeMinutes" 
                        name="preparationTimeMinutes" 
                        min="0"
                        defaultValue="15"
                        className={styles.input}
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Alérgenos</label>
                    <div className={styles.allergenGrid}>
                      {["Gluten", "Lácteos", "Huevos", "Pescado", "Frutos de cáscara", "Soja", "Mostaza", "Sésamo"].map((allergen) => (
                        <label key={allergen} className={styles.allergenLabel}>
                          <input 
                            type="checkbox" 
                            name="allergens" 
                            value={allergen} 
                            className={styles.allergenCheckbox}
                            disabled={isPending}
                          />
                          {allergen}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="description" className={styles.label}>Descripción</label>
                    <textarea 
                      id="description" 
                      name="description" 
                      className={styles.textarea} 
                      placeholder="Ingredientes clave o notas adicionales..."
                      disabled={isPending}
                    />
                  </div>
                  
                  {/* CROSS SELL SECTION */}
                  <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(56, 189, 248, 0.1)', marginTop: '0.5rem' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#38bdf8', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          name="isCrossSell"
                          value="on"
                          style={{ accentColor: '#38bdf8' }} 
                        />
                        Sugerir en Venta Cruzada (Checkout)
                     </label>
                     <p style={{ fontSize: '0.7rem', color: '#78716c', marginTop: '0.25rem' }}>
                        Al activarlo, este producto se ofrecerá como extra justo antes de que el cliente realice el pago.
                     </p>
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
                    {isPending ? "Guardando..." : "Crear Producto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
