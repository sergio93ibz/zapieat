"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, Image as ImageIcon, LayoutList, Trash2, ArrowRight, Check } from "lucide-react";
import styles from "./modal.module.css";
import parentStyles from "./menu.module.css";
import { 
  createProductAction, 
  createModifierGroupAction,
  addModifierToGroupAction,
  deleteModifierGroupAction,
  deleteModifierAction,
} from "./actions";
import { Portal } from "@/components/ui/Portal";

interface Category {
  id: string;
  name: string;
}

interface AddComboModalProps {
  categories: Category[];
  allProducts: any[];
}

export function AddComboModal({ categories, allProducts }: AddComboModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(1); // 1: Info, 2: Steps/Contents
  const [errorObj, setError] = useState<{ error?: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Menu Info
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  
  // Created Product ID after step 1
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  // Steps (Modifier Groups) being built
  const [comboGroups, setComboGroups] = useState<Array<{ id: string; name: string; modifiers: any[] }>>([]);
  const [newStepName, setNewStepName] = useState("");
  const [selectedProductByGroup, setSelectedProductByGroup] = useState<Record<string, string>>({});
  const [extraPriceByGroup, setExtraPriceByGroup] = useState<Record<string, string>>({});

  const handleCreateCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) {
      setError({ error: "Nombre, categoría y precio son obligatorios." });
      return;
    }

    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.append("name", name);
      formData.append("categoryId", categoryId);
      formData.append("price", price);
      formData.append("description", description);
      formData.append("imageUrl", previewUrl || "");
      formData.append("isCombo", "on");

      const result = await createProductAction(null, formData);
      
      if (result?.error) {
        setError({ error: result.error });
      } else if (result.product) {
        setCreatedProductId(result.product.id);
        setCurrentStep(2);
      }
    });
  };

  const handleAddStepToCombo = async () => {
    if (!newStepName.trim() || !createdProductId) return;

    startTransition(async () => {
      setError(null);
      const res: any = await createModifierGroupAction(createdProductId, newStepName, 1, 1, true);
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      if (res?.group?.id) {
        setComboGroups(prev => [...prev, { id: res.group.id, name: newStepName, modifiers: [] }]);
        setNewStepName("");
      } else {
        setError({ error: "No se pudo crear el paso." });
      }
    });
  }

  const handleDeleteStep = (groupId: string) => {
    if (!confirm("¿Borrar este paso y sus platos?")) return;
    startTransition(async () => {
      setError(null);
      const res: any = await deleteModifierGroupAction(groupId);
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      setComboGroups(prev => prev.filter(g => g.id !== groupId));
      setSelectedProductByGroup(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setExtraPriceByGroup(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    });
  }

  const handleAddDishToStep = (groupId: string) => {
    const linkedProductId = selectedProductByGroup[groupId];
    if (!linkedProductId) return;
    const prod = allProducts.find((p: any) => p.id === linkedProductId);
    if (!prod) {
      setError({ error: "Producto no válido." });
      return;
    }
    const existing = comboGroups.find(g => g.id === groupId)?.modifiers?.some((m: any) => m.linkedProductId === linkedProductId);
    if (existing) {
      setError({ error: "Ese plato ya está en este paso." });
      return;
    }
    const extra = extraPriceByGroup[groupId] || "0";
    const extraNum = extra.trim() === "" ? 0 : parseFloat(extra);
    if (!Number.isFinite(extraNum)) {
      setError({ error: "El extra no es válido." });
      return;
    }

    startTransition(async () => {
      setError(null);
      const res: any = await addModifierToGroupAction(groupId, prod.name, extraNum, linkedProductId);
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      if (res?.modifier?.id) {
        setComboGroups(prev => prev.map(g => g.id === groupId ? { ...g, modifiers: [...g.modifiers, res.modifier] } : g));
        setSelectedProductByGroup(prev => ({ ...prev, [groupId]: "" }));
        setExtraPriceByGroup(prev => ({ ...prev, [groupId]: "" }));
      } else {
        setError({ error: "No se pudo anadir el plato." });
      }
    });
  }

  const handleRemoveDishFromStep = (groupId: string, modifierId: string) => {
    startTransition(async () => {
      setError(null);
      const res: any = await deleteModifierAction(modifierId);
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      setComboGroups(prev => prev.map(g => g.id === groupId ? { ...g, modifiers: g.modifiers.filter((m: any) => m.id !== modifierId) } : g));
    });
  }

  const handleFinish = () => {
    setIsOpen(false);
  }

  return (
    <>
      <button 
        className={parentStyles.btnPrimary} 
          onClick={() => {
              setIsOpen(true);
              setCurrentStep(1);
              setCreatedProductId(null);
              setComboGroups([]);
              setSelectedProductByGroup({});
              setExtraPriceByGroup({});
              setError(null);
              setName("");
              setPrice("");
              setCategoryId("");
              setDescription("");
              setPreviewUrl(null);
          }}
        style={{ backgroundColor: '#a78bfa', border: 'none', boxShadow: '0 4px 14px 0 rgba(167, 139, 250, 0.3)' }}
      >
        <LayoutList size={16} />
        Crear Menú / Combo
      </button>

      {isOpen && (
        <Portal>
          <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsOpen(false);
          }}>
            <div className={styles.modal} style={{ maxWidth: '600px', height: 'auto', maxHeight: '90vh' }}>
              <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '0.5rem', borderRadius: '0.5rem' }}>
                        <LayoutList size={20} />
                    </div>
                    <div>
                        <h3 className={styles.title}>{currentStep === 1 ? "Nuevo Menú" : `Pasos de: ${name}`}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#78716c' }}>
                           {currentStep === 1 ? "Paso 1: Información básica" : "Paso 2: Define qué incluye el menú"}
                        </p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={() => setIsOpen(false)} type="button">
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.formContainer} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className={styles.form} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                  
                  {errorObj?.error && (
                    <div className={styles.errorAlert}>{errorObj.error}</div>
                  )}

                  {currentStep === 1 ? (
                    <>
                      <div className={styles.imageUploadContainer}>
                        <div 
                          className={styles.imagePlaceholder} 
                          onClick={() => document.getElementById('comboImageInput')?.click()}
                           style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', height: '140px', borderStyle: 'dashed', borderColor: '#a78bfa' }}
                          >
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className={styles.imagePreview} />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#a78bfa' }}>
                              <ImageIcon size={32} />
                              <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Sube una foto del Menú</span>
                            </div>
                          )}
                        </div>
                        <input id="comboImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             const formData = new FormData();
                             formData.append("file", file);
                             const res = await fetch("/api/upload", { method: "POST", body: formData });
                             const data = await res.json();
                             if (data.url) setPreviewUrl(data.url);
                        }} />
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Nombre del Menú *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className={styles.input} placeholder="Ej. Menú del Día" disabled={isPending} />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className={styles.inputGroup} style={{ flex: 2 }}>
                          <label className={styles.label}>Categoría *</label>
                          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className={styles.select} disabled={isPending}>
                            <option value="">Selecciona categoría...</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </div>
                        <div className={styles.inputGroup} style={{ flex: 1 }}>
                          <label className={styles.label}>Precio (€) *</label>
                          <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className={styles.input} placeholder="15.00" disabled={isPending} />
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Descripción</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className={styles.textarea} placeholder="Ej. Incluye entrante, plato principal, postre y bebida." disabled={isPending} />
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ backgroundColor: 'rgba(167, 139, 250, 0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(167, 139, 250, 0.1)' }}>
                           <h4 style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>Añadir Paso (Ej: Primer plato, Bebida...)</h4>
                           <div style={{ display: 'flex', gap: '0.5rem' }}>
                             <input 
                               type="text" 
                               value={newStepName} 
                               onChange={e => setNewStepName(e.target.value)}
                               className={styles.input} 
                               placeholder="Nombre del paso..."
                               onKeyDown={e => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   handleAddStepToCombo();
                                 }
                               }}
                             />
                             <button 
                               onClick={handleAddStepToCombo}
                               className={styles.btnSubmit}
                                style={{ width: 'auto', padding: '0 1.5rem', backgroundColor: '#a78bfa' }}
                                disabled={isPending}
                              >
                               <Plus size={18} />
                             </button>
                          </div>
                       </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f4' }}>Pasos y platos:</h4>
                          {comboGroups.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: '#78716c', fontStyle: 'italic' }}>Aún no has añadido pasos a este menú.</p>
                          ) : (
                            comboGroups.map((group, idx) => (
                              <div key={group.id} style={{ padding: '1rem', backgroundColor: '#262626', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                     <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700 }}>#{idx + 1}</span>
                                    <span style={{ fontSize: '0.95rem', color: '#fafaf9', fontWeight: 600 }}>{group.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#78716c' }}>(elige 1)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStep(group.id)}
                                    disabled={isPending}
                                    className={styles.btnDeleteMini}
                                    title="Borrar paso"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                  <select
                                    className={styles.smallInput}
                                    style={{ flex: 1, fontSize: '0.75rem' }}
                                    value={selectedProductByGroup[group.id] || ""}
                                    onChange={(e) => setSelectedProductByGroup(p => ({ ...p, [group.id]: e.target.value }))}
                                    disabled={isPending}
                                  >
                                    <option value="">Selecciona un plato...</option>
                                    {allProducts
                                      .filter((p: any) => p.id !== createdProductId)
                                      .map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                  </select>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className={styles.smallInput}
                                    style={{ width: '90px' }}
                                    placeholder="Extra €"
                                    value={extraPriceByGroup[group.id] || ""}
                                    onChange={(e) => setExtraPriceByGroup(p => ({ ...p, [group.id]: e.target.value }))}
                                    disabled={isPending}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddDishToStep(group.id)}
                                    className={styles.btnAddSmall}
                                    disabled={isPending}
                                    style={{ width: '44px' }}
                                    title="Anadir plato"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>

                                {group.modifiers.length === 0 ? (
                                  <p style={{ fontSize: '0.75rem', color: '#78716c', fontStyle: 'italic' }}>Sin platos en este paso.</p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {group.modifiers.map((m: any) => (
                                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ color: '#fafaf9', fontSize: '0.85rem', fontWeight: 500 }}>{m.name}</span>
                                          {m.price && Number(m.price) > 0 && (
                                            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>+{Number(m.price).toFixed(2)}€</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDishFromStep(group.id, m.id)}
                                          disabled={isPending}
                                          className={styles.btnDeleteMini}
                                          title="Quitar plato"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#78716c' }}>* Tip: los pasos son secciones obligatorias. Si quieres un paso opcional o con mas de una eleccion, lo ajustamos en una mejora rapida.</p>
                    </div>
                  )}
                </div>

                <div className={styles.footer}>
                  {currentStep === 1 ? (
                    <>
                      <button type="button" className={styles.btnCancel} onClick={() => setIsOpen(false)} disabled={isPending}>
                        Cancelar
                      </button>
                      <button onClick={handleCreateCombo} className={styles.btnSubmit} disabled={isPending} style={{ backgroundColor: '#a78bfa' }}>
                        {isPending ? "Configurando..." : "Siguiente: Definir Pasos"}
                        <ArrowRight size={16} />
                      </button>
                    </>
                  ) : (
                    <button onClick={handleFinish} className={styles.btnSubmit} style={{ backgroundColor: '#22c55e' }}>
                      <Check size={18} /> Finalizar y Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
