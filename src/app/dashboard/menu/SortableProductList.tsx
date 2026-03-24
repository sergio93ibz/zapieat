"use client";

import React, { useState } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderProductsAction } from "./actions";

interface SortableProductItemProps {
  id: string;
  product: any;
  renderProduct: (product: any) => React.ReactNode;
}

function SortableProductItem({ id, product, renderProduct }: SortableProductItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.7 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div 
        {...attributes} 
        {...listeners} 
        style={{ 
          position: 'absolute', 
          top: '12px', 
          right: '12px', 
          cursor: 'grab',
          color: '#ffffff',
          padding: '6px',
          backgroundColor: 'rgba(167, 139, 250, 0.4)',
          borderRadius: '6px',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        title="Mover producto"
      >
        <GripVertical size={18} />
      </div>
      {renderProduct(product)}
    </div>
  );
}

export function SortableProductList({ initialProducts, renderProduct }: { initialProducts: any[], renderProduct: (product: any) => React.ReactNode }) {
  const [products, setProducts] = useState(initialProducts);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
       const oldIndex = products.findIndex(p => p.id === active.id);
       const newIndex = products.findIndex(p => p.id === over.id);
       
       const newOrder = arrayMove(products, oldIndex, newIndex);
       setProducts(newOrder);
       reorderProductsAction(newOrder.map(p => p.id));
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={products.map(p => p.id)} strategy={rectSortingStrategy}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', width: '100%' }}>
          {products.map((product) => (
             <SortableProductItem 
               key={product.id} 
               id={product.id} 
               product={product} 
               renderProduct={renderProduct}
             />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
