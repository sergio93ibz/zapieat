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
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderCategoriesAction } from "./actions";

interface SortableCategoryItemProps {
  id: string;
  category: any;
  renderItem: (category: any) => React.ReactNode;
}

function SortableCategoryItem({ id, category, renderItem }: SortableCategoryItemProps) {
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
    zIndex: isDragging ? 10 : 1,
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
          left: '-35px', 
          top: '25px', 
          cursor: 'grab',
          color: '#a78bfa',
          padding: '10px',
          zIndex: 5
        }}
        title="Arrastrar para reordenar categoría"
      >
        <GripVertical size={24} />
      </div>
      {renderItem(category)}
    </div>
  );
}

export function SortableCategoryList({ initialCategories, renderItem }: { initialCategories: any[], renderItem: (category: any) => React.ReactNode }) {
  const [categories, setCategories] = useState(initialCategories);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      setCategories(newOrder);
      
      reorderCategoriesAction(newOrder.map(c => c.id));
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingLeft: '35px' }}>
          {categories.map((category) => (
            <SortableCategoryItem 
              key={category.id} 
              id={category.id} 
              category={category}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
