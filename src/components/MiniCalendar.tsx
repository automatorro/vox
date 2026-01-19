import { useState, useCallback } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Item } from "@/types";
import { Button } from "@/components/ui/button";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  items: Item[];
}

export const MiniCalendar = ({ selectedDate, onDateSelect, items }: MiniCalendarProps) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);

  const baseWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStart = addWeeks(baseWeekStart, weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const goToPrevWeek = useCallback(() => {
    if (isAnimating) return;
    setAnimationDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setWeekOffset(prev => prev - 1);
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 150);
  }, [isAnimating]);

  const goToNextWeek = useCallback(() => {
    if (isAnimating) return;
    setAnimationDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setWeekOffset(prev => prev + 1);
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 150);
  }, [isAnimating]);

  const goToCurrentWeek = useCallback(() => {
    setWeekOffset(0);
    onDateSelect(new Date());
  }, [onDateSelect]);

  // Swipe navigation for mobile
  const { handlers: swipeHandlers, swipeOffset } = useSwipeNavigation({
    onSwipeLeft: goToNextWeek,
    onSwipeRight: goToPrevWeek,
    threshold: 40,
  });

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
  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-foreground">
          {format(currentWeekStart, 'd', { locale: ro })} - {format(addDays(currentWeekStart, 6), 'd MMMM yyyy', { locale: ro })}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goToPrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={goToCurrentWeek}
            >
              Azi
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goToNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        className="touch-pan-y"
        {...swipeHandlers}
      >
        <div 
          className={cn(
            "grid grid-cols-7 gap-1 transition-all duration-150",
            isAnimating && animationDirection === 'left' && "opacity-0 -translate-x-3",
            isAnimating && animationDirection === 'right' && "opacity-0 translate-x-3",
          )}
          style={{
            transform: swipeOffset && !isAnimating ? `translateX(${swipeOffset * 0.2}px)` : undefined,
          }}
        >
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
            const itemCount = getItemsForDate(day).length;
            
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
                
                {hasContent && (
                  <div className={cn(
                    "absolute bottom-1 flex gap-0.5",
                    selected && "opacity-70"
                  )}>
                    {itemCount === 1 && (
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        selected ? "bg-primary-foreground" : "bg-primary"
                      )} />
                    )}
                    {itemCount === 2 && (
                      <>
                        <div className={cn("w-1 h-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />
                        <div className={cn("w-1 h-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />
                      </>
                    )}
                    {itemCount >= 3 && (
                      <>
                        <div className={cn("w-1 h-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />
                        <div className={cn("w-1 h-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />
                        <div className={cn("w-1 h-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Swipe hint for mobile - only show initially */}
      <p className="text-center text-[10px] text-muted-foreground/40 mt-2 md:hidden">
        ← Glisează pentru altă săptămână →
      </p>
    </div>
  );
};
