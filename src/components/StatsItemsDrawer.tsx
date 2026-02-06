import { Item, Task, Event, Reminder } from "@/types";
import { Category } from "@/hooks/useCategories";
import { ItemCard } from "@/components/ItemCard";
import { CheckCircle2, Calendar, Bell, TrendingUp } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type StatType = 'tasks' | 'events' | 'reminders' | 'completed';

interface StatsItemsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: StatType;
  items: Item[];
  categories?: Category[];
  onComplete?: (id: string) => void;
  onEdit?: (item: Item) => void;
  onDelete?: (id: string) => void;
}

const typeConfig: Record<StatType, { icon: React.ElementType; title: string; color: string }> = {
  tasks: { icon: CheckCircle2, title: 'Taskuri rămase', color: 'text-task' },
  events: { icon: Calendar, title: 'Evenimente', color: 'text-event' },
  reminders: { icon: Bell, title: 'Remindere', color: 'text-reminder' },
  completed: { icon: TrendingUp, title: 'Taskuri completate', color: 'text-primary' },
};

export const StatsItemsDrawer = ({
  open,
  onOpenChange,
  type,
  items,
  categories,
  onComplete,
  onEdit,
  onDelete,
}: StatsItemsDrawerProps) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  const filteredItems = items.filter(item => {
    if (type === 'tasks') {
      return item.type === 'task' && !(item as Task).completed;
    }
    if (type === 'events') {
      return item.type === 'event';
    }
    if (type === 'reminders') {
      return item.type === 'reminder';
    }
    if (type === 'completed') {
      return item.type === 'task' && (item as Task).completed;
    }
    return false;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            {config.title}
            <span className="text-muted-foreground font-normal">
              ({filteredItems.length})
            </span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-60px)] pr-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon className={`h-12 w-12 ${config.color} opacity-30 mb-4`} />
              <p className="text-muted-foreground">
                {type === 'tasks' && 'Niciun task de făcut'}
                {type === 'events' && 'Niciun eveniment programat'}
                {type === 'reminders' && 'Niciun reminder setat'}
                {type === 'completed' && 'Niciun task completat încă'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  onComplete={onComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
