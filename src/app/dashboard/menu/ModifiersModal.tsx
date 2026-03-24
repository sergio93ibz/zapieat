"use client"

import React, { useState, useTransition } from "react"
import { Plus, X, Trash2, Settings2, PlusCircle } from "lucide-react"
import styles from "./modal.module.css"
import { Portal } from "@/components/ui/Portal"
import { 
  createModifierGroupAction, 
  deleteModifierGroupAction, 
  addModifierToGroupAction, 
  deleteModifierAction 
} from "./actions"

interface Modifier {
  id: string
  name: string
  price: any
}

interface ModifierGroup {
  id: string
  name: string
  required: boolean
  minSelections: number
  maxSelections: number
  modifiers: Modifier[]
}

interface ModifiersModalProps {
  productId: string
  productName: string
  groups: ModifierGroup[]
  allProducts: any[]
  onClose: () => void
}

export function ModifiersModal({ productId, productName, groups, allProducts, onClose }: ModifiersModalProps) {
  const [isPending, startTransition] = useTransition()
  
  // States for the creation of new groups
  const [newGroupName, setNewGroupName] = useState("")
  const [isRequired, setIsRequired] = useState(false)
  
  // Local states for inputs for each group (controlled components)
  const [modNames, setModNames] = useState<Record<string, string>>({})
  const [modPrices, setModPrices] = useState<Record<string, string>>({})
  const [modProductLinks, setModProductLinks] = useState<Record<string, string>>({})

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return
    startTransition(async () => {
      await createModifierGroupAction(
        productId, 
        newGroupName, 
        isRequired ? 1 : 0, 
        isRequired ? 1 : 10, 
        isRequired
      )
      setNewGroupName("")
      setIsRequired(false)
    })
  }

  const handleDeleteGroup = (id: string) => {
    if (!confirm("¿Borrar sección completa de opciones?")) return
    startTransition(async () => {
      await deleteModifierGroupAction(id)
    })
  }

  const handleAddModifier = (groupId: string) => {
    const name = modNames[groupId]
    const price = modPrices[groupId] || "0"
    const linkedProductId = modProductLinks[groupId]
    
    if (!name?.trim()) return

    startTransition(async () => {
      await (addModifierToGroupAction as any)(groupId, name, parseFloat(price), linkedProductId)
      setModNames(prev => ({ ...prev, [groupId]: "" }))
      setModPrices(prev => ({ ...prev, [groupId]: "" }))
      setModProductLinks(prev => ({ ...prev, [groupId]: "" }))
    })
  }

  const handleDeleteModifier = (modId: string) => {
    startTransition(async () => {
      await deleteModifierAction(modId)
    })
  }

  return (
    <Portal>
      <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={styles.modal} style={{ maxWidth: "600px" }}>
          <div className={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <Settings2 size={20} color="#f97316" />
               <h3 className={styles.title}>Opciones de {productName}</h3>
            </div>
            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
          </div>

          <div className={styles.form}>
             <div className={styles.modifierContainer}>
               
               {/* LISTADO DE GRUPOS ACTUALES */}
               {groups.map(group => (
                 <div key={group.id} className={styles.groupCard}>
                   <div className={styles.groupHeader}>
                     <div>
                       <span style={{ fontWeight: 600, color: '#fafaf9' }}>{group.name}</span>
                       <span style={{ fontSize: '0.7rem', color: isPending ? '#78716c' : '#f97316', marginLeft: '0.5rem' }}>
                         {group.required ? "(Obligatorio)" : "(Opcional)"}
                       </span>
                     </div>
                     <button onClick={() => handleDeleteGroup(group.id)} className={styles.btnDeleteMini}>
                       <Trash2 size={16} />
                     </button>
                   </div>

                    <div className={styles.modifierList}>
                      {group.modifiers.map((mod: any) => (
                        <div key={mod.id} className={styles.modifierItem}>
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                             <span style={{ fontWeight: 500 }}>{mod.name}</span>
                             {mod.linkedProductId && (
                               <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>
                                 Vínculo: {allProducts.find(p => p.id === mod.linkedProductId)?.name || 'Producto vinculado'}
                               </span>
                             )}
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ color: '#22c55e', fontWeight: 600 }}>+{Number(mod.price).toFixed(2)}€</span>
                              <button onClick={() => handleDeleteModifier(mod.id)} className={styles.btnDeleteMini}>
                                <X size={14} />
                              </button>
                           </div>
                        </div>
                      ))}
                    </div>

                    {/* FORM PARA AÑADIR MODIFICADOR A ESTE GRUPO */}
                    <div className={styles.addModifierForm} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          placeholder="Nombre (ej. Extra Bacon)" 
                          className={styles.smallInput}
                          style={{ flex: 1 }}
                          value={modNames[group.id] || ""}
                          onChange={(e) => setModNames(p => ({ ...p, [group.id]: e.target.value }))}
                          disabled={isPending}
                        />
                        <input 
                          type="number" 
                          placeholder="€" 
                          className={styles.smallInput} 
                          style={{ width: '60px' }}
                          value={modPrices[group.id] || ""}
                          onChange={(e) => setModPrices(p => ({ ...p, [group.id]: e.target.value }))}
                          disabled={isPending}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          className={styles.smallInput}
                          style={{ flex: 1, fontSize: '0.7rem' }}
                          value={modProductLinks[group.id] || ""}
                          onChange={(e) => {
                             setModProductLinks(p => ({ ...p, [group.id]: e.target.value }))
                             // Auto-fill name if empty
                             if (!modNames[group.id] && e.target.value) {
                               const prod = allProducts.find(p => p.id === e.target.value)
                               if (prod) setModNames(p => ({ ...p, [group.id]: prod.name }))
                             }
                          }}
                          disabled={isPending}
                        >
                          <option value="">-- Sin vínculo a producto --</option>
                          {allProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button className={styles.btnAddSmall} style={{ width: '40px' }} onClick={() => handleAddModifier(group.id)} disabled={isPending}>
                           <PlusCircle size={14} />
                        </button>
                      </div>
                    </div>
                 </div>
               ))}

               {/* AGREGAR NUEVO GRUPO */}
               <div style={{ padding: "1.25rem", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "0.75rem", display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#a8a29e', fontWeight: 600 }}>Crear nueva sección de variantes (Ej: Elige tu masa, Toppings...)</span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input 
                      className={styles.input} 
                      style={{ flex: 1 }} 
                      placeholder="Nombre de la sección..." 
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      disabled={isPending}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#a8a29e', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} disabled={isPending} />
                      Obligatorio
                    </label>
                    <button className={styles.btnSubmit} style={{ padding: '0.5rem 1rem' }} onClick={handleCreateGroup} disabled={isPending}>
                      Crear
                    </button>
                  </div>
               </div>

             </div>
          </div>

          <div className={styles.footer}>
             <button className={styles.btnCancel} onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
