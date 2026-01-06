import { useState } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Item, Task } from "@/types";
import { Category } from "@/hooks/useCategories";
import { ItemCard } from "./ItemCard";
import { AlertCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayViewProps {
  date: Date;
  items: Item[];
  categories?: Category[];
  overloaded?: boolean;
  onCompleteTask?: (id: string) => void;
  onEditItem?: (item: Item) => void;
  onDeleteItem?: (id: string) => void;
  onReorderItems?: (reorderedItems: Item[]) => void;
}

export const DayView = ({ 
  date, 
  items, 
  categories, 
  overloaded, 
  onCompleteTask, 
  onEditItem, 
  onDeleteItem,
  onReorderItems 
}: DayViewProps) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
  
  // Use items directly without auto-sorting to allow manual reorder
  const sortedItems = [...items];

  const completedCount = items.filter(i => i.type === 'task' && (i as Task).completed).length;
  const totalTasks = items.filter(i => i.type === 'task').length;

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    setDraggedId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, item: Item) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (item.id !== draggedId) {
      setDragOverId(item.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetItem: Item) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetItem.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = sortedItems.findIndex(i => i.id === draggedId);
    const targetIndex = sortedItems.findIndex(i => i.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...sortedItems];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    onReorderItems?.(newItems);
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {isToday ? 'Astăzi' : format(date, 'EEEE', { locale: ro })}
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            {format(date, 'd MMMM', { locale: ro })}
          </h2>
        </div>
        
        {totalTasks > 0 && (
          <div className="text-right">
            <p className="text-2xl font-semibold text-foreground">
              {completedCount}/{totalTasks}
            </p>
            <p className="text-sm text-muted-foreground">completate</p>
          </div>
        )}
      </div>

      {/* Overload warning */}
      {overloaded && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-reminder-muted/30 border border-reminder/30 mb-4">
          <AlertCircle className="h-5 w-5 text-reminder flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-reminder">Zi aglomerată</p>
            <p className="text-xs text-muted-foreground">Ai multe de făcut. Poate reprogramăm ceva?</p>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nimic programat pentru azi</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Apasă butonul de voce pentru a adăuga ceva
            </p>
          </div>
        ) : (
          sortedItems.map((item, index) => (
            <div 
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item)}
              style={{ animationDelay: `${index * 0.05}s` }}
              className={cn(
                "animate-fade-in-up relative group transition-all duration-200",
                draggedId === item.id && "opacity-50 scale-95",
                dragOverId === item.id && "translate-y-2"
              )}
            >
              {/* Drop indicator */}
              {dragOverId === item.id && (
                <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
              
              <div className="flex items-center gap-2">
                {/* Drag handle */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                
                <div className="flex-1">
                  <ItemCard 
                    item={item}
                    categories={categories}
                    onComplete={onCompleteTask}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
