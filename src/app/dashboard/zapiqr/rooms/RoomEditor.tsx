"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { Plus, Trash2, GripHorizontal, Square, Circle } from "lucide-react";
import { createTableAction, deleteTableAction, updateTablePositionAction } from "./actions";

export function RoomEditor({ room, tables }: { room: any, tables: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [newTableName, setNewTableName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Dragging state
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [localTables, setLocalTables] = useState(tables);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    // only start drag if we aren't clicking a configuration button
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') return;
    
    setDraggingTable(id);
    const tbl = localTables.find(t => t.id === id);
    if (!tbl) return;
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Calculate mouse offset from the top-left of the table itself
    const offsetX = e.clientX - canvasRect.left - tbl.x;
    const offsetY = e.clientY - canvasRect.top - tbl.y;
    
    setOffset({ x: offsetX, y: offsetY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTable || !canvasRef.current) return;
    e.preventDefault();
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let newX = e.clientX - canvasRect.left - offset.x;
    let newY = e.clientY - canvasRect.top - offset.y;
    
    // Bounds check
    const tbl = localTables.find(t => t.id === draggingTable);
    if (!tbl) return;
    
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + tbl.width > room.width) newX = room.width - tbl.width;
    if (newY + tbl.height > room.height) newY = room.height - tbl.height;

    setLocalTables(prev => prev.map(t => 
      t.id === draggingTable ? { ...t, x: newX, y: newY } : t
    ));
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!draggingTable) return;
    const tbl = localTables.find(t => t.id === draggingTable);
    setDraggingTable(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (tbl) {
       // Save to DB
       await updateTablePositionAction(tbl.id, tbl.x, tbl.y, tbl.width, tbl.height, tbl.shape);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    startTransition(async () => {
      await createTableAction(room.id, newTableName);
      setNewTableName("");
    });
  };

  const handleDeleteTable = async (id: string, name: string) => {
    if (!confirm(`¿Borrar la mesa ${name}?`)) return;
    startTransition(async () => {
      await deleteTableAction(id);
    });
  };

  const handleChangeShape = async (id: string, currentShape: string) => {
    const tbl = localTables.find(t => t.id === id);
    if (!tbl) return;
    const newShape = currentShape === "square" ? "round" : "square";
    setLocalTables(prev => prev.map(t => t.id === id ? { ...t, shape: newShape } : t));
    await updateTablePositionAction(tbl.id, tbl.x, tbl.y, tbl.width, tbl.height, newShape);
  };

  return (
    <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexDirection: "row" }}>
       
       <div style={{ flexShrink: 0, width: "300px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ color: "white", marginTop: 0, marginBottom: "1.5rem" }}>Mesas en el salón</h3>
          
          <form onSubmit={handleAddTable} style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
             <input 
               type="text" 
               placeholder="Mesa 10" 
               value={newTableName}
               onChange={e => setNewTableName(e.target.value)}
               style={{ flex: 1, padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white" }}
             />
             <button type="submit" disabled={isPending || !newTableName.trim()} style={{ background: "#f97316", color: "white", border: "none", padding: "0.75rem 1rem", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "bold" }}>Añadir</button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {localTables.length === 0 ? (
              <p style={{ color: "#a8a29e", fontSize: "0.875rem", textAlign: "center" }}>No hay mesas en este salón</p>
            ) : localTables.map(t => (
               <div key={`list-${t.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.5rem" }}>
                 <span style={{ color: "white", fontWeight: 500 }}>{t.name}</span>
                 <div style={{ display: "flex", gap: "0.25rem" }}>
                   <button onClick={() => handleChangeShape(t.id, t.shape)} style={{ background: "transparent", border: "none", color: "#a8a29e", cursor: "pointer", padding: "0.25rem" }} title="Cambiar forma">
                     {t.shape === "round" ? <Circle size={16} /> : <Square size={16} />}
                   </button>
                   <button onClick={() => handleDeleteTable(t.id, t.name)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.25rem" }} title="Borrar">
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
            ))}
          </div>
       </div>

       {/* THE CANVAS */}
       <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#1e1e24", borderRadius: "1rem", padding: "2rem", border: "1px solid rgba(255,255,255,0.05)" }}>
         <div 
           ref={canvasRef}
           style={{ 
             width: `${room.width}px`, 
             height: `${room.height}px`, 
             backgroundColor: "rgba(0,0,0,0.2)", 
             border: "2px dashed rgba(255,255,255,0.1)",
             borderRadius: "1rem",
             position: "relative",
             boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
             touchAction: "none" // Prevent scrolling on mobile while dragging
           }}
           onPointerMove={handlePointerMove}
         >
           {localTables.map(t => (
             <div 
               key={t.id}
               onPointerDown={(e) => handlePointerDown(e, t.id)}
               onPointerUp={handlePointerUp}
               onPointerCancel={handlePointerUp}
               style={{
                 position: "absolute",
                 left: t.x,
                 top: t.y,
                 width: t.width,
                 height: t.height,
                 backgroundColor: t.isActive ? "#a855f7" : "#52525b",
                 borderRadius: t.shape === "round" ? "50%" : "0.5rem",
                 display: "flex",
                 alignItems: "center",
                 justifyContent: "center",
                 color: "white",
                 fontWeight: "bold",
                 cursor: draggingTable === t.id ? "grabbing" : "grab",
                 boxShadow: draggingTable === t.id ? "0 10px 25px rgba(0,0,0,0.5)" : "0 4px 6px rgba(0,0,0,0.3)",
                 border: "2px solid rgba(255,255,255,0.2)",
                 userSelect: "none",
                 zIndex: draggingTable === t.id ? 10 : 1,
                 transition: draggingTable === t.id ? "none" : "box-shadow 0.2s"
               }}
             >
               {t.name}
             </div>
           ))}
         </div>
       </div>

    </div>
  );
}
