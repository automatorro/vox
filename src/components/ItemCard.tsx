import { CheckCircle2, Clock, Calendar, Bell, Circle, Pencil, Trash2, MoreVertical, Timer, FolderOpen, Repeat } from "lucide-react";
import { Task, Event, Reminder, Priority, RecurrenceType } from "@/types";
import { Category } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ItemCardProps {
  item: Task | Event | Reminder;
  categories?: Category[];
  onComplete?: (id: string) => void;
  onEdit?: (item: Task | Event | Reminder) => void;
  onDelete?: (id: string) => void;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-task/20 text-task' },
  high: { label: 'High', className: 'bg-reminder/20 text-reminder' },
  critical: { label: 'Critical', className: 'bg-destructive/20 text-destructive' },
};

const recurrenceLabels: Record<RecurrenceType, string> = {
  none: '',
  daily: 'Zilnic',
  weekly: 'Săptămânal',
  monthly: 'Lunar',
};

export const ItemCard = ({ item, categories, onComplete, onEdit, onDelete }: ItemCardProps) => {
  const isTask = item.type === 'task';
  const isEvent = item.type === 'event';
  const isReminder = item.type === 'reminder';
  
  const taskCategory = isTask && (item as Task).categoryId 
    ? categories?.find(c => c.id === (item as Task).categoryId)
    : null;

  const getTypeStyles = () => {
    if (isTask) return 'border-l-task bg-task-muted/30';
    if (isEvent) return 'border-l-event bg-event-muted/30';
    return 'border-l-reminder bg-reminder-muted/30';
  };

  const getIcon = () => {
    if (isTask) {
      return (item as Task).completed ? (
        <CheckCircle2 className="h-5 w-5 text-task" />
      ) : (
        <Circle className="h-5 w-5 text-task/50 hover:text-task cursor-pointer transition-colors" />
      );
    }
    if (isEvent) return <Calendar className="h-5 w-5 text-event" />;
    return <Bell className="h-5 w-5 text-reminder" />;
  };

  const getTimeInfo = () => {
    if (isTask) {
      const task = item as Task;
      return format(task.deadline, 'd MMM', { locale: ro });
    }
    if (isEvent) {
      const event = item as Event;
      return `${format(event.startTime, 'HH:mm')} · ${event.duration} min`;
    }
    const reminder = item as Reminder;
    return format(reminder.time, 'HH:mm');
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-xl border-l-4 transition-all duration-200 hover:scale-[1.02]",
        getTypeStyles(),
        isTask && (item as Task).completed && "opacity-50"
      )}
    >
      {/* Icon / Checkbox */}
      <button
        onClick={() => isTask && onComplete?.(item.id)}
        className="mt-0.5 flex-shrink-0"
      >
        {getIcon()}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "font-medium text-foreground truncate",
          isTask && (item as Task).completed && "line-through"
        )}>
          {item.title}
        </h3>
        
        {isTask && (item as Task).description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {(item as Task).description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {getTimeInfo()}
          </span>

          {isTask && (
            <>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                priorityConfig[(item as Task).priority].className
              )}>
                {priorityConfig[(item as Task).priority].label}
              </span>
              {(item as Task).duration && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  {formatDuration((item as Task).duration!)}
                </span>
              )}
              {taskCategory && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: taskCategory.color }}
                  />
                  {taskCategory.name}
                </span>
              )}
            </>
          )}

          {isEvent && (item as Event).synced && (
            <span className="text-xs text-event/70 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-event" />
              Sincronizat
            </span>
          )}

          {/* Recurrence badge - for all types */}
          {item.recurrenceType && item.recurrenceType !== 'none' && (
            <span className="text-xs text-primary/70 flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {recurrenceLabels[item.recurrenceType]}
            </span>
          )}
        </div>
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          <DropdownMenuItem onClick={() => onEdit?.(item)} className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4" />
            Editează
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete?.(item.id)} 
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Șterge
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
