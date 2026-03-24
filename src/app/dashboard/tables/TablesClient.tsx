"use client";

import React, { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Trash2, QrCode, X, Download, Copy, Check, ExternalLink } from "lucide-react";
import { createTableAction, deleteTableAction, toggleTableStatusAction } from "./actions";
import { Portal } from "@/components/ui/Portal";
import styles from "../menu/menu.module.css";
import modalStyles from "../menu/modal.module.css";

import { RoomQRView } from "./RoomQRView";

interface Table {
  id: string;
  name: string;
  isActive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: string;
}

interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: Table[];
}

interface TablesClientProps {
  rooms: Room[];
  orphanTables: Table[];
  slug: string;
}

export function TablesClient({ rooms, orphanTables, slug }: TablesClientProps) {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(rooms.length > 0 ? rooms[0].id : (orphanTables.length > 0 ? "orphan" : null));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleCreateTable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // If we have an active room, we might want to associate it, but for now just create it
    startTransition(async () => {
      const res = await createTableAction(formData);
      if (res.success) {
        setIsAddModalOpen(false);
      } else {
        alert(res.error);
      }
    });
  };

  const handleDeleteTable = (id: string) => {
    if (confirm("¿Seguro que quieres eliminar esta mesa?")) {
      startTransition(async () => {
        await deleteTableAction(id);
      });
    }
  };

  const handleToggleStatus = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleTableStatusAction(id, !current);
    });
  };

  const getTableUrl = (tableId: string) => {
    const envBase = process.env.NEXT_PUBLIC_APP_URL;
    const baseUrl = (envBase && envBase.trim().length > 0)
      ? envBase.trim().replace(/\/$/, "")
      : (typeof window !== "undefined" ? window.location.origin : "");
    return `${baseUrl}/${slug}/table/${tableId}`;
  };

  const isProbablyLocalhost = (url: string) => {
    try {
      const u = new URL(url)
      return u.hostname === "localhost" || u.hostname === "127.0.0.1"
    } catch {
      return false
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeRoom = Array.isArray(rooms) ? rooms.find(r => r.id === activeRoomId) : null;

  return (
    <div className={styles.container}>
      <div className={styles.headerActions}>
        <div className={styles.headerLeft}>
          <h2>Gestión de Mesas</h2>
          <p>Tus salones y mesas para generar códigos QR únicos.</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <a href="/dashboard/zapiqr/rooms" className={styles.btnPrimary} style={{ backgroundColor: "#8b5cf6", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Editor Visual
          </a>
          <button className={styles.btnPrimary} onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            Nueva Mesa
          </button>
        </div>
      </div>

      {/* Tabs de Salones */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem", marginTop: "1rem" }}>
        {rooms.map(r => (
          <button 
            key={r.id}
            onClick={() => setActiveRoomId(r.id)}
            style={{ 
              padding: "0.6rem 1.2rem", borderRadius: "2rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", whiteSpace: "nowrap",
              backgroundColor: activeRoomId === r.id ? "#f97316" : "rgba(255,255,255,0.05)",
              color: activeRoomId === r.id ? "white" : "#d6d3d1",
              transition: "all 0.2s"
            }}
          >
            {r.name}
          </button>
        ))}
        {orphanTables.length > 0 && (
          <button 
            onClick={() => setActiveRoomId("orphan")}
            style={{ 
              padding: "0.6rem 1.2rem", borderRadius: "2rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", whiteSpace: "nowrap",
              backgroundColor: activeRoomId === "orphan" ? "#f97316" : "rgba(255,255,255,0.05)",
              color: activeRoomId === "orphan" ? "white" : "#d6d3d1",
              transition: "all 0.2s"
            }}
          >
            Sin Salón
          </button>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {activeRoom ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ color: "#a8a29e", fontSize: "0.9rem" }}>Pincha en una mesa para ver su código QR y enlace directo.</p>
            <RoomQRView 
              room={activeRoom} 
              tables={activeRoom.tables} 
              onTableClick={(t) => setSelectedTable(t as any)} 
            />
          </div>
        ) : activeRoomId === "orphan" ? (
          <div className={styles.productsGrid}>
            {orphanTables.map((table) => (
              <div key={table.id} className={styles.productCard} style={{ cursor: 'pointer' }} onClick={() => setSelectedTable(table as any)}>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#f97316', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <span style={{ fontWeight: 700 }}>{table.name.substring(0, 2)}</span>
                      </div>
                      <div>
                        <h4 style={{ color: '#fafaf9', fontWeight: 600, fontSize: '1.125rem' }}>{table.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: table.isActive ? '#22c55e' : '#ef4444' }}>
                          {table.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0c0a09', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QRCodeSVG value={getTableUrl(table.id)} size={100} level="M" includeMargin={false} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
            <p style={{ color: '#a8a29e' }}>No hay salones o mesas creadas.</p>
          </div>
        )}
      </div>


      {/* MODAL AÑADIR MESA */}
      {isAddModalOpen && (
        <Portal>
          <div className={modalStyles.overlay} onClick={() => setIsAddModalOpen(false)}>
            <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
              <div className={modalStyles.header}>
                <h3 className={modalStyles.title}>Nueva Mesa</h3>
                <button className={modalStyles.closeBtn} onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateTable} className={modalStyles.form}>
                <div className={modalStyles.inputGroup}>
                  <label className={modalStyles.label}>Nombre de la Mesa *</label>
                  <input type="text" name="name" className={modalStyles.input} placeholder="Ej. Mesa 1, Terraza 4..." required />
                </div>
                <div className={modalStyles.footer}>
                  <button type="button" className={modalStyles.btnCancel} onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                  <button type="submit" className={modalStyles.btnSubmit} disabled={isPending}>
                    {isPending ? "Creando..." : "Crear Mesa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* MODAL DETALLE DE MESA / QR */}
      {selectedTable && (
        <Portal>
          <div className={modalStyles.overlay} onClick={() => setSelectedTable(null)}>
            <div className={modalStyles.modal} style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <div className={modalStyles.header}>
                <h3 className={modalStyles.title}>{selectedTable.name}</h3>
                <button className={modalStyles.closeBtn} onClick={() => setSelectedTable(null)}><X size={20} /></button>
              </div>
              <div className={modalStyles.form} style={{ alignItems: 'center', textAlign: 'center' }}>
                {isProbablyLocalhost(getTableUrl(selectedTable.id)) && (
                  <div style={{
                    width: '100%',
                    background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.25)',
                    color: '#fdba74',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    marginBottom: '1rem',
                    textAlign: 'left',
                    fontSize: '0.85rem'
                  }}>
                    Estas en entorno local. Si escaneas el QR desde el movil, "localhost" apunta al movil y fallara.
                    Configura `NEXT_PUBLIC_APP_URL` con la IP de tu PC (ej: `http://192.168.1.50:3000`) y reinicia.
                  </div>
                )}
                {downloadError && (
                  <div style={{
                    width: '100%',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fecaca',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    marginBottom: '1rem',
                    textAlign: 'left'
                  }}>
                    {downloadError}
                  </div>
                )}
                <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '1.5rem', marginBottom: '1.5rem' }}>
                  <QRCodeSVG 
                    id="table-qr"
                    value={getTableUrl(selectedTable.id)} 
                    size={200} 
                    level="H"
                  />
                </div>
                
                <div style={{ width: '100%', textAlign: 'left' }}>
                  <label className={modalStyles.label}>Enlace Directo</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input 
                      readOnly 
                      value={getTableUrl(selectedTable.id)} 
                      className={modalStyles.input} 
                      style={{ flex: 1, backgroundColor: '#0c0a09', fontSize: '0.75rem' }} 
                    />
                    <button 
                      className={modalStyles.btnCancel} 
                      style={{ padding: '0.5rem' }}
                      onClick={() => handleCopyUrl(getTableUrl(selectedTable.id))}
                    >
                      {copied ? <Check size={18} color="#22c55e" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                  <a 
                    href={getTableUrl(selectedTable.id)} 
                    target="_blank" 
                    className={modalStyles.btnCancel}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  >
                    <ExternalLink size={16} /> Abrir
                  </a>
                  <button 
                    type="button"
                    onClick={() => {
                        try {
                          setDownloadError(null);
                          const svgEl = document.getElementById("table-qr") as SVGElement | null;
                          if (!svgEl) throw new Error("No se encontro el QR.");

                          // Ensure namespaces (helps when opening the SVG standalone)
                          if (!svgEl.getAttribute("xmlns")) svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                          if (!svgEl.getAttribute("xmlns:xlink")) svgEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

                          const svgData = new XMLSerializer().serializeToString(svgEl);
                          const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
                          const url = URL.createObjectURL(blob);

                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          if (!ctx) throw new Error("Canvas no soportado.");

                          const img = new Image();
                          img.onload = () => {
                            try {
                              const size = 1024;
                              canvas.width = size;
                              canvas.height = size;
                              ctx.clearRect(0, 0, size, size);
                              ctx.drawImage(img, 0, 0, size, size);
                              URL.revokeObjectURL(url);

                              const pngUrl = canvas.toDataURL("image/png");
                              const downloadLink = document.createElement("a");
                              downloadLink.href = pngUrl;
                              downloadLink.download = `QR_${selectedTable.name}.png`;
                              downloadLink.click();
                            } catch (e: any) {
                              URL.revokeObjectURL(url);
                              setDownloadError(e?.message || "No se pudo generar el PNG.");
                            }
                          };
                          img.onerror = () => {
                            URL.revokeObjectURL(url);
                            setDownloadError("No se pudo renderizar el QR para descarga.");
                          };
                          img.src = url;
                        } catch (e: any) {
                          setDownloadError(e?.message || "No se pudo descargar el QR.");
                        }
                    }}
                    className={modalStyles.btnSubmit}
                    style={{ flex: 1, gap: '0.5rem' }}
                  >
                    <Download size={16} /> Descargar
                  </button>
                </div>

                <button 
                  onClick={() => handleToggleStatus(selectedTable.id, selectedTable.isActive)}
                  style={{ marginTop: '1.5rem', width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: selectedTable.isActive ? '#ef4444' : '#22c55e', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  {selectedTable.isActive ? "Desactivar Mesa" : "Activar Mesa"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
