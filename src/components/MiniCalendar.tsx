import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Item } from "@/types";

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  items: Item[];
}

export const MiniCalendar = ({ selectedDate, onDateSelect, items }: MiniCalendarProps) => {
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
      const itemDate = item.type === 'task' 
        ? (item as any).deadline 
        : item.type === 'event' 
          ? (item as any).startTime 
          : (item as any).time;
      return isSameDay(new Date(itemDate), date);
    });
  };

  const hasItems = (date: Date) => getItemsForDate(date).length > 0;
  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-foreground">
          {format(selectedDate, 'MMMM yyyy', { locale: ro })}
        </h3>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Day names */}
        {weekDays.map((day) => (
          <div 
            key={`header-${day.toISOString()}`}
            className="text-center text-xs text-muted-foreground py-2"
          >
            {format(day, 'EEE', { locale: ro })}
          </div>
        ))}

        {/* Days */}
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const hasContent = hasItems(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-200",
                selected && "bg-primary text-primary-foreground",
                !selected && today && "bg-primary/20 text-primary",
                !selected && !today && "hover:bg-accent text-foreground"
              )}
            >
              <span className="text-sm font-medium">
                {format(day, 'd')}
              </span>
              
              {hasContent && !selected && (
                <div className="absolute bottom-1 flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
