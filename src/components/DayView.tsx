import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Item, Task } from "@/types";
import { Category } from "@/hooks/useCategories";
import { ItemCard } from "./ItemCard";
import { AlertCircle } from "lucide-react";

interface DayViewProps {
  date: Date;
  items: Item[];
  categories?: Category[];
  overloaded?: boolean;
  onCompleteTask?: (id: string) => void;
  onEditItem?: (item: Item) => void;
  onDeleteItem?: (id: string) => void;
}

export const DayView = ({ date, items, categories, overloaded, onCompleteTask, onEditItem, onDeleteItem }: DayViewProps) => {
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
  
  // Sort items by time/priority
  const sortedItems = [...items].sort((a, b) => {
    // Events first, by time
    if (a.type === 'event' && b.type !== 'event') return -1;
    if (a.type !== 'event' && b.type === 'event') return 1;
    
    // Then reminders
    if (a.type === 'reminder' && b.type === 'task') return -1;
    if (a.type === 'task' && b.type === 'reminder') return 1;
    
    // Tasks by priority
    if (a.type === 'task' && b.type === 'task') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[(a as Task).priority] - priorityOrder[(b as Task).priority];
    }
    
    return 0;
  });

  const completedCount = items.filter(i => i.type === 'task' && (i as Task).completed).length;
  const totalTasks = items.filter(i => i.type === 'task').length;

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
              style={{ animationDelay: `${index * 0.05}s` }}
              className="animate-fade-in-up"
            >
              <ItemCard 
                item={item}
                categories={categories}
                onComplete={onCompleteTask}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
