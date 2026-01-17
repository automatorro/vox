import { useState, useCallback } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths,
  isSameMonth,
  isSameDay,
  isToday
} from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Circle, Calendar, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item, Task, Event, Reminder } from "@/types";
import { cn } from "@/lib/utils";
import { useTouchDragDrop } from "@/hooks/useTouchDragDrop";
import { useConfirmationSound } from "@/hooks/useConfirmationSound";

interface MonthCalendarProps {
  items: Item[];
  onDaySelect: (date: Date) => void;
  selectedDate: Date;
  onMoveItemToDate?: (itemId: string, newDate: Date) => void;
}

export const MonthCalendar = ({ items, onDaySelect, selectedDate, onMoveItemToDate }: MonthCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [recentlyDroppedId, setRecentlyDroppedId] = useState<string | null>(null);
  const { playSuccessSound } = useConfirmationSound();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
      const itemDate = item.type === 'task' 
        ? (item as Task).deadline 
        : item.type === 'event' 
          ? (item as Event).startTime 
          : (item as Reminder).time;
      return isSameDay(new Date(itemDate), date);
    });
  };

  const handleMoveItem = useCallback((itemId: string, targetDate: Date) => {
    if (onMoveItemToDate) {
      onMoveItemToDate(itemId, targetDate);
      // Trigger success animation and sound
      playSuccessSound();
      setRecentlyDroppedId(itemId);
      setTimeout(() => setRecentlyDroppedId(null), 500);
    }
    setDragOverDate(null);
  }, [onMoveItemToDate, playSuccessSound]);

  // Touch drag and drop
  const touchDrag = useTouchDragDrop({
    dropTargetSelector: '[data-calendar-day]',
    onDragEnd: (id, dropTarget) => {
      if (dropTarget) {
        const dateStr = dropTarget.getAttribute('data-date');
        if (dateStr) {
          handleMoveItem(id, new Date(dateStr));
        }
      }
      setDragOverDate(null);
    },
  });

  // Mouse drag handlers
  const handleDragStart = (e: React.DragEvent, item: Item) => {
    e.stopPropagation();
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData('itemId');
    if (itemId) {
      handleMoveItem(itemId, targetDate);
    }
  };

  const dayNames = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'];

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ro })}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentMonth(new Date());
              onDaySelect(new Date());
            }}
          >
            Astăzi
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass rounded-2xl p-4 overflow-hidden">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((name) => (
            <div 
              key={name}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayDate, index) => {
            const dayItems = getItemsForDate(dayDate);
            const isCurrentMonth = isSameMonth(dayDate, currentMonth);
            const isSelected = isSameDay(dayDate, selectedDate);
            const isTodayDate = isToday(dayDate);
            
            const tasks = dayItems.filter(i => i.type === 'task');
            const events = dayItems.filter(i => i.type === 'event');
            const reminders = dayItems.filter(i => i.type === 'reminder');

            const isDragOver = dragOverDate && isSameDay(dragOverDate, dayDate);

            return (
              <div
                key={dayDate.toISOString()}
                data-calendar-day
                data-drop-target
                data-date={dayDate.toISOString()}
                onClick={() => onDaySelect(dayDate)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverDate(dayDate);
                }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => handleDrop(e, dayDate)}
                className={cn(
                  "relative min-h-[80px] p-2 rounded-xl text-left transition-all duration-200 hover:bg-accent/50 cursor-pointer",
                  isCurrentMonth ? "bg-card/50" : "bg-transparent opacity-40",
                  isSelected && "ring-2 ring-primary bg-primary/10",
                  isTodayDate && !isSelected && "bg-primary/20",
                  isDragOver && "ring-2 ring-primary/50 bg-primary/5 scale-[1.02]",
                  "[&.touch-drag-over]:ring-2 [&.touch-drag-over]:ring-primary [&.touch-drag-over]:bg-primary/10 [&.touch-drag-over]:scale-[1.02]"
                )}
                style={{ animationDelay: `${index * 0.01}s` }}
              >
                {/* Day number */}
                <span className={cn(
                  "text-sm font-medium",
                  isTodayDate && "text-primary",
                  !isCurrentMonth && "text-muted-foreground"
                )}>
                  {format(dayDate, 'd')}
                </span>

                {/* Items indicators */}
                <div className="mt-1 space-y-0.5">
                  {/* Events */}
                  {events.slice(0, 2).map((event) => (
                    <div 
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event)}
                      onTouchStart={(e) => touchDrag.handleTouchStart(e, event.id)}
                      onTouchMove={touchDrag.handleTouchMove}
                      onTouchEnd={touchDrag.handleTouchEnd}
                      onTouchCancel={touchDrag.handleTouchCancel}
                      className={cn(
                        "flex items-center gap-1 text-[10px] text-event truncate cursor-move hover:bg-accent/30 rounded px-0.5",
                        recentlyDroppedId === event.id && "animate-drop-success"
                      )}
                    >
                      <Calendar className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                  
                  {/* Tasks */}
                  {tasks.slice(0, 2).map((task) => (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onTouchStart={(e) => touchDrag.handleTouchStart(e, task.id)}
                      onTouchMove={touchDrag.handleTouchMove}
                      onTouchEnd={touchDrag.handleTouchEnd}
                      onTouchCancel={touchDrag.handleTouchCancel}
                      className={cn(
                        "flex items-center gap-1 text-[10px] truncate cursor-move hover:bg-accent/30 rounded px-0.5",
                        (task as Task).completed ? "text-muted-foreground line-through" : "text-task",
                        recentlyDroppedId === task.id && "animate-drop-success"
                      )}
                    >
                      <Circle className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  
                  {/* Reminders */}
                  {reminders.slice(0, 1).map((reminder) => (
                    <div 
                      key={reminder.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, reminder)}
                      onTouchStart={(e) => touchDrag.handleTouchStart(e, reminder.id)}
                      onTouchMove={touchDrag.handleTouchMove}
                      onTouchEnd={touchDrag.handleTouchEnd}
                      onTouchCancel={touchDrag.handleTouchCancel}
                      className={cn(
                        "flex items-center gap-1 text-[10px] text-reminder truncate cursor-move hover:bg-accent/30 rounded px-0.5",
                        recentlyDroppedId === reminder.id && "animate-drop-success"
                      )}
                    >
                      <Bell className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{reminder.title}</span>
                    </div>
                  ))}
                  
                  {/* More indicator */}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayItems.length - 3} mai mult
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-task" />
          <span>Task</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-event" />
          <span>Eveniment</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-reminder" />
          <span>Reminder</span>
        </div>
      </div>
    </div>
  );
};
