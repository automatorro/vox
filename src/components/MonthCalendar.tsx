import { useState } from "react";
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

interface MonthCalendarProps {
  items: Item[];
  onDaySelect: (date: Date) => void;
  selectedDate: Date;
}

export const MonthCalendar = ({ items, onDaySelect, selectedDate }: MonthCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

            return (
              <button
                key={dayDate.toISOString()}
                onClick={() => onDaySelect(dayDate)}
                className={cn(
                  "relative min-h-[80px] p-2 rounded-xl text-left transition-all duration-200 hover:bg-accent/50",
                  isCurrentMonth ? "bg-card/50" : "bg-transparent opacity-40",
                  isSelected && "ring-2 ring-primary bg-primary/10",
                  isTodayDate && !isSelected && "bg-primary/20"
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
                      className="flex items-center gap-1 text-[10px] text-event truncate"
                    >
                      <Calendar className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                  
                  {/* Tasks */}
                  {tasks.slice(0, 2).map((task) => (
                    <div 
                      key={task.id}
                      className={cn(
                        "flex items-center gap-1 text-[10px] truncate",
                        (task as Task).completed ? "text-muted-foreground line-through" : "text-task"
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
                      className="flex items-center gap-1 text-[10px] text-reminder truncate"
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
              </button>
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
