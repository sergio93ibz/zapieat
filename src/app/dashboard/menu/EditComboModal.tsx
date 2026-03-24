"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Image as ImageIcon, LayoutList, Plus, Trash2, X } from "lucide-react";
import styles from "./modal.module.css";
import { Portal } from "@/components/ui/Portal";
import {
  addModifierToGroupAction,
  createModifierGroupAction,
  deleteModifierAction,
  deleteModifierGroupAction,
  updateModifierAction,
  updateModifierGroupAction,
  updateProductAction,
} from "./actions";

interface Category {
  id: string;
  name: string;
}

interface EditComboModalProps {
  product: any;
  categories: Category[];
  allProducts: any[];
  onClose: () => void;
}

export function EditComboModal({ product, categories, allProducts, onClose }: EditComboModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(1);
  const [errorObj, setError] = useState<{ error?: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product.imageUrl);

  const [name, setName] = useState(product.name || "");
  const [categoryId, setCategoryId] = useState(product.categoryId || "");
  const [price, setPrice] = useState(product.price?.toString?.() ?? String(product.price ?? ""));
  const [description, setDescription] = useState(product.description || "");

  const initialGroups = useMemo(() => {
    const groups = (product.modifierGroups || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      required: !!g.required,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections,
      modifiers: (g.modifiers || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        linkedProductId: m.linkedProductId,
      })),
    }));
    return groups;
  }, [product.modifierGroups]);

  const [comboGroups, setComboGroups] = useState<any[]>(initialGroups);
  const [newStepName, setNewStepName] = useState("");
  const [selectedProductByGroup, setSelectedProductByGroup] = useState<Record<string, string>>({});
  const [extraPriceByGroup, setExtraPriceByGroup] = useState<Record<string, string>>({});
  const [renameByGroup, setRenameByGroup] = useState<Record<string, string>>({});

  const handleSaveInfo = async () => {
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
      // Keep it as menu/combo
      formData.append("isCombo", "on");

      const res: any = await updateProductAction(product.id, formData);
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      router.refresh();
      setCurrentStep(2);
    });
  };

  const handleAddStep = () => {
    if (!newStepName.trim()) return;
    startTransition(async () => {
      setError(null);
      const res: any = await createModifierGroupAction(product.id, newStepName.trim(), 1, 1, true);
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      if (!res?.group?.id) {
        setError({ error: "No se pudo crear el paso." });
        return;
      }
      setComboGroups(prev => [...prev, { id: res.group.id, name: newStepName.trim(), required: true, minSelections: 1, maxSelections: 1, modifiers: [] }]);
      setNewStepName("");
      router.refresh();
    });
  };

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
      router.refresh();
    });
  };

  const handleRenameStep = (groupId: string) => {
    const nextName = (renameByGroup[groupId] || "").trim();
    if (!nextName) return;
    startTransition(async () => {
      setError(null);
      const res: any = await updateModifierGroupAction(groupId, { name: nextName });
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      setComboGroups(prev => prev.map(g => (g.id === groupId ? { ...g, name: nextName } : g)));
      setRenameByGroup(prev => ({ ...prev, [groupId]: "" }));
      router.refresh();
    });
  };

  const handleAddDishToStep = (groupId: string) => {
    const linkedProductId = selectedProductByGroup[groupId];
    if (!linkedProductId) return;
    const prod = allProducts.find((p: any) => p.id === linkedProductId);
    if (!prod) {
      setError({ error: "Producto no válido." });
      return;
    }
    const existing = comboGroups
      .find(g => g.id === groupId)
      ?.modifiers?.some((m: any) => m.linkedProductId === linkedProductId);
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
      if (!res?.modifier?.id) {
        setError({ error: "No se pudo añadir el plato." });
        return;
      }
      setComboGroups(prev => prev.map(g => (g.id === groupId ? { ...g, modifiers: [...g.modifiers, res.modifier] } : g)));
      setSelectedProductByGroup(prev => ({ ...prev, [groupId]: "" }));
      setExtraPriceByGroup(prev => ({ ...prev, [groupId]: "" }));
      router.refresh();
    });
  };

  const handleRemoveDishFromStep = (groupId: string, modifierId: string) => {
    startTransition(async () => {
      setError(null);
      const res: any = await deleteModifierAction(modifierId);
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      setComboGroups(prev => prev.map(g => (g.id === groupId ? { ...g, modifiers: g.modifiers.filter((m: any) => m.id !== modifierId) } : g)));
      router.refresh();
    });
  };

  const handleUpdateExtra = (groupId: string, modifierId: string, nextExtra: string) => {
    const num = nextExtra.trim() === "" ? 0 : parseFloat(nextExtra);
    if (!Number.isFinite(num)) {
      setError({ error: "El extra no es válido." });
      return;
    }
    startTransition(async () => {
      setError(null);
      const res: any = await updateModifierAction(modifierId, { price: num });
      if (res?.error) {
        setError({ error: res.error });
        return;
      }
      setComboGroups(prev => prev.map(g => (g.id === groupId ? { ...g, modifiers: g.modifiers.map((m: any) => (m.id === modifierId ? { ...m, price: num } : m)) } : g)));
      router.refresh();
    });
  };

  return (
    <Portal>
      <div className={styles.overlay} onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}>
        <div className={styles.modal} style={{ maxWidth: "650px", height: "auto", maxHeight: "90vh" }}>
          <div className={styles.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ backgroundColor: "rgba(167, 139, 250, 0.1)", color: "#a78bfa", padding: "0.5rem", borderRadius: "0.5rem" }}>
                <LayoutList size={20} />
              </div>
              <div>
                <h3 className={styles.title}>{currentStep === 1 ? `Editar Menú` : `Configurar pasos: ${name}`}</h3>
                <p style={{ fontSize: "0.75rem", color: "#78716c" }}>
                  {currentStep === 1 ? "Paso 1: Información" : "Paso 2: Pasos y platos"}
                </p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose} type="button">
              <X size={20} />
            </button>
          </div>

          <div className={styles.formContainer} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            <div className={styles.form} style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              {errorObj?.error && <div className={styles.errorAlert}>{errorObj.error}</div>}

              {currentStep === 1 ? (
                <>
                  <div className={styles.imageUploadContainer}>
                    <label className={styles.label}>Imagen del Menú</label>
                    <div
                      className={styles.imagePlaceholder}
                      onClick={() => document.getElementById("editComboImageInput")?.click()}
                      style={{ cursor: "pointer", position: "relative", overflow: "hidden", height: "140px", borderStyle: "dashed", borderColor: "#a78bfa" }}
                    >
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className={styles.imagePreview} />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#a78bfa" }}>
                          <ImageIcon size={32} />
                          <span style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>Sube una foto del Menú</span>
                        </div>
                      )}
                    </div>
                    <input
                      id="editComboImageInput"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        const data = await res.json();
                        if (data.url) setPreviewUrl(data.url);
                        else setError({ error: data.error || "Fallo al subir la imagen" });
                      }}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Nombre del Menú *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={styles.input}
                      placeholder="Ej. Menú del Día"
                      disabled={isPending}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className={styles.inputGroup} style={{ flex: 2 }}>
                      <label className={styles.label}>Categoría *</label>
                      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={styles.select} disabled={isPending}>
                        <option value="">Selecciona categoría...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                      <label className={styles.label}>Precio (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className={styles.input}
                        placeholder="15.00"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Descripción</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={styles.textarea}
                      placeholder="Ej. Incluye entrante, plato principal, postre y bebida."
                      disabled={isPending}
                    />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ backgroundColor: "rgba(167, 139, 250, 0.05)", padding: "1rem", borderRadius: "1rem", border: "1px solid rgba(167, 139, 250, 0.1)" }}>
                    <h4 style={{ color: "var(--color-secondary)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem" }}>Añadir Paso</h4>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={newStepName}
                        onChange={(e) => setNewStepName(e.target.value)}
                        className={styles.input}
                        placeholder="Ej. Entrante, Principal, Bebida..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddStep();
                          }
                        }}
                        disabled={isPending}
                      />
                      <button type="button" onClick={handleAddStep} className={styles.btnSubmit} style={{ width: "auto", padding: "0 1.25rem", backgroundColor: "#a78bfa" }} disabled={isPending}>
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  {comboGroups.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: "#78716c", fontStyle: "italic" }}>Este menú aún no tiene pasos.</p>
                  ) : (
                    comboGroups.map((group: any, idx: number) => (
                      <div key={group.id} style={{ padding: "1rem", backgroundColor: "#262626", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "0.7rem", color: "#a78bfa", fontWeight: 800 }}>#{idx + 1}</span>
                            <span style={{ fontSize: "0.95rem", color: "#fafaf9", fontWeight: 600 }}>{group.name}</span>
                            <span style={{ fontSize: "0.7rem", color: "#78716c" }}>(elige 1)</span>
                          </div>
                          <button type="button" onClick={() => handleDeleteStep(group.id)} disabled={isPending} className={styles.btnDeleteMini} title="Borrar paso">
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                          <input
                            type="text"
                            className={styles.smallInput}
                            style={{ flex: 1 }}
                            placeholder="Renombrar paso..."
                            value={renameByGroup[group.id] || ""}
                            onChange={(e) => setRenameByGroup(p => ({ ...p, [group.id]: e.target.value }))}
                            disabled={isPending}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameStep(group.id)}
                            className={styles.btnAddSmall}
                            disabled={isPending}
                            style={{ width: "44px" }}
                            title="Guardar nombre"
                          >
                            <Check size={16} />
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                          <select
                            className={styles.smallInput}
                            style={{ flex: 1, fontSize: "0.75rem" }}
                            value={selectedProductByGroup[group.id] || ""}
                            onChange={(e) => setSelectedProductByGroup(p => ({ ...p, [group.id]: e.target.value }))}
                            disabled={isPending}
                          >
                            <option value="">Selecciona un plato...</option>
                            {allProducts
                              .filter((p: any) => p.id !== product.id)
                              .map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            className={styles.smallInput}
                            style={{ width: "90px" }}
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
                            style={{ width: "44px" }}
                            title="Añadir plato"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {group.modifiers.length === 0 ? (
                          <p style={{ fontSize: "0.75rem", color: "#78716c", fontStyle: "italic" }}>Sin platos en este paso.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            {group.modifiers.map((m: any) => (
                              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.75rem", borderRadius: "0.6rem", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                  <span style={{ color: "#fafaf9", fontSize: "0.85rem", fontWeight: 500 }}>{m.name}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontSize: "0.7rem", color: "#78716c" }}>Extra:</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      defaultValue={Number(m.price || 0)}
                                      className={styles.smallInput}
                                      style={{ width: "100px", fontSize: "0.75rem" }}
                                      disabled={isPending}
                                      onBlur={(e) => handleUpdateExtra(group.id, m.id, e.currentTarget.value)}
                                    />
                                  </div>
                                </div>
                                <button type="button" onClick={() => handleRemoveDishFromStep(group.id, m.id)} disabled={isPending} className={styles.btnDeleteMini} title="Quitar plato">
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
              )}
            </div>

            <div className={styles.footer}>
              {currentStep === 1 ? (
                <>
                  <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isPending}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSaveInfo} className={styles.btnSubmit} disabled={isPending} style={{ backgroundColor: "#a78bfa" }}>
                    {isPending ? "Guardando..." : "Siguiente: Pasos"}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => { router.refresh(); onClose(); }} className={styles.btnSubmit} style={{ backgroundColor: "#22c55e" }} disabled={isPending}>
                  <Check size={18} /> Guardar y Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
