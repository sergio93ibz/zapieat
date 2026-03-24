"use client";

import React from "react";

interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: string;
  isActive: boolean;
}

interface RoomQRViewProps {
  room: any;
  tables: Table[];
  onTableClick: (table: Table) => void;
}

export function RoomQRView({ room, tables, onTableClick }: RoomQRViewProps) {
  return (
    <div style={{ 
      overflow: "auto", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      backgroundColor: "#1e1e24", 
      borderRadius: "1rem", 
      padding: "2rem", 
      border: "1px solid rgba(255,255,255,0.05)",
      minHeight: "400px"
    }}>
      <div 
        style={{ 
          width: `${room.width}px`, 
          height: `${room.height}px`, 
          backgroundColor: "rgba(0,0,0,0.2)", 
          border: "2px dashed rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          position: "relative",
          boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
        }}
      >
        {tables.map(t => (
          <div 
            key={t.id}
            onClick={() => onTableClick(t)}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              width: t.width,
              height: t.height,
              backgroundColor: t.isActive ? "#f97316" : "#52525b",
              borderRadius: t.shape === "round" ? "50%" : "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
              border: "2px solid rgba(255,255,255,0.2)",
              userSelect: "none",
              zIndex: 1,
              transition: "transform 0.2s, background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              if (t.isActive) e.currentTarget.style.backgroundColor = "#fb923c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              if (t.isActive) e.currentTarget.style.backgroundColor = "#f97316";
            }}
          >
            {t.name}
          </div>
        ))}
      </div>
    </div>
  );
}
