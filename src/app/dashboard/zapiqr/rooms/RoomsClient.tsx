"use client";

import React, { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createRoomAction, deleteRoomAction } from "./actions";
import { RoomEditor } from "./RoomEditor";

export function RoomsClient({ rooms }: { rooms: any[] }) {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(rooms.length > 0 ? rooms[0].id : null);
  const [isPending, startTransition] = useTransition();
  const [newRoomName, setNewRoomName] = useState("");

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    
    startTransition(async () => {
      const res = await createRoomAction(newRoomName);
      if (res?.success && res.room) {
        setNewRoomName("");
        setActiveRoomId(res.room.id);
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de borrar el salón "${name}" y todas sus mesas?`)) return;
    
    startTransition(async () => {
      await deleteRoomAction(id);
      if (activeRoomId === id) setActiveRoomId(rooms[0]?.id || null);
    });
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {rooms.map(r => (
           <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
             <button
               onClick={() => setActiveRoomId(r.id)}
               style={{ 
                 padding: "0.75rem 1.5rem", borderRadius: "2rem", fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                 backgroundColor: activeRoomId === r.id ? "#a855f7" : "rgba(255,255,255,0.05)",
                 color: activeRoomId === r.id ? "white" : "#d6d3d1",
               }}
             >
               {r.name}
             </button>
             {activeRoomId === r.id && (
               <button onClick={() => handleDeleteRoom(r.id, r.name)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.5rem" }} title="Borrar salón">
                 <Trash2 size={16} />
               </button>
             )}
           </div>
        ))}
        
        <form onSubmit={handleCreateRoom} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input 
            type="text" 
            placeholder="Nuevo Salón..." 
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            style={{ padding: "0.75rem 1rem", borderRadius: "2rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white" }}
          />
          <button type="submit" disabled={isPending || !newRoomName.trim()} style={{ background: "#4ade80", color: "#166534", border: "none", padding: "0.75rem", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={20} />
          </button>
        </form>
      </div>

      {activeRoom ? (
        <RoomEditor room={activeRoom} tables={activeRoom.tables} key={activeRoom.id} />
      ) : (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#a8a29e", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "1rem", border: "1px dashed rgba(255,255,255,0.1)" }}>
           Inicia creando un salón para poder organizar tus mesas visualmente.
        </div>
      )}
    </div>
  );
}
