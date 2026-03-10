import { useState } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { AlertTriangle, Calendar, Trash2, ArrowRight, Clock, CheckCircle2, X, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item, Task, Event, Reminder } from '@/types';

export interface OverloadedDay {
  date: string;
  count: number;
  items: Item[];
}

interface OverloadResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overloadedDays: OverloadedDay[];
  allItems: Item[];
  onReschedule: (itemId: string, newDate: Date) => void;
  onDelete: (itemId: string) => void;
  onEditItem: (item: Item) => void;
}

export const OverloadResolutionModal = ({
  open,
  onOpenChange,
  overloadedDays,
  allItems,
  onReschedule,
  onDelete,
  onEditItem,
}: OverloadResolutionModalProps) => {
  const [ignoredDays, setIgnoredDays] = useState<Set<string>>(new Set());

  const activeDays = overloadedDays.filter(day => !ignoredDays.has(day.date));

  const getItemDate = (item: Item): Date => {
    if (item.type === 'task') {
      return new Date((item as Task).deadline);
    } else if (item.type === 'event') {
      return new Date((item as Event).startTime);
    } else {
      return new Date((item as Reminder).time);
    }
  };

  const getItemsForDate = (date: Date): Item[] => {
    return allItems.filter(item => {
      const itemDate = getItemDate(item);
      if (isSameDay(itemDate, date)) return true;
      const recurrenceType = item.recurrenceType;
      if (!recurrenceType || recurrenceType === 'none') return false;
      // For overload modal, use simple same-day check for recurring items
      return false; // Keep simple here to avoid complexity
    });
  };

  const formatItemTime = (item: Item): string => {
    if (item.type === 'task') {
      return `Deadline: ${format(new Date((item as Task).deadline), 'HH:mm', { locale: ro })}`;
    } else if (item.type === 'event') {
      const event = item as Event;
      return `${format(new Date(event.startTime), 'HH:mm', { locale: ro })} (${event.duration} min)`;
    } else {
      return format(new Date((item as Reminder).time), 'HH:mm', { locale: ro });
    }
  };

  const formatItemTimeShort = (item: Item): string => {
    if (item.type === 'task') {
      return format(new Date((item as Task).deadline), 'HH:mm', { locale: ro });
    } else if (item.type === 'event') {
      return format(new Date((item as Event).startTime), 'HH:mm', { locale: ro });
    } else {
      return format(new Date((item as Reminder).time), 'HH:mm', { locale: ro });
    }
  };

  const getItemIcon = (item: Item) => {
    switch (item.type) {
      case 'task':
        return <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />;
      case 'event':
        return <Calendar className="h-3.5 w-3.5 text-emerald-400" />;
      case 'reminder':
        return <Clock className="h-3.5 w-3.5 text-amber-400" />;
    }
  };

  const getPriorityColor = (item: Item) => {
    if (item.type !== 'task') return '';
    const task = item as Task;
    switch (task.priority) {
      case 'critical':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-green-500';
    }
  };

  const getLoadIndicator = (count: number) => {
    if (count === 0) return { color: 'text-green-500', label: 'Liberă' };
    if (count < 3) return { color: 'text-green-500', label: 'Lejer' };
    if (count < 5) return { color: 'text-amber-500', label: 'Moderat' };
    return { color: 'text-red-500', label: 'Încărcat' };
  };

  const handleIgnoreDay = (dateKey: string) => {
    setIgnoredDays(prev => new Set(prev).add(dateKey));
  };

  const getSuggestedDates = (date: string): { date: Date; label: string }[] => {
    const baseDate = new Date(date);
    return [
      { date: addDays(baseDate, 1), label: 'Mâine' },
      { date: addDays(baseDate, 2), label: 'Poimâine' },
      { date: addDays(baseDate, 7), label: 'Săpt. viitoare' },
    ];
  };

  const DestinationPreview = ({ targetDate, currentItemId }: { targetDate: Date; currentItemId: string }) => {
    const existingItems = getItemsForDate(targetDate).filter(item => item.id !== currentItemId);
    const loadIndicator = getLoadIndicator(existingItems.length);

    return (
      <div className="w-64">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-sm">
              {format(targetDate, 'EEEE', { locale: ro })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(targetDate, 'd MMMM yyyy', { locale: ro })}
            </p>
          </div>
          <div className={`text-xs font-medium ${loadIndicator.color}`}>
            {loadIndicator.label}
          </div>
        </div>

        {existingItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500/50" />
            <p className="text-xs">Ziua este liberă!</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {existingItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-1.5 rounded bg-muted/50 text-xs"
              >
                {getItemIcon(item)}
                <span className="truncate flex-1">{item.title}</span>
                <span className="text-muted-foreground">{formatItemTimeShort(item)}</span>
              </div>
            ))}
            {existingItems.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{existingItems.length - 5} mai mult{existingItems.length - 5 > 1 ? 'e' : ''}
              </p>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            După mutare: <span className="font-medium text-foreground">{existingItems.length + 1} itemi</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Zile Supraîncărcate ({activeDays.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6 py-4">
          {activeDays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Nicio zi supraîncărcată!</p>
              <p className="text-sm mt-2">
                Programul tău este echilibrat.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeDays.map((day) => (
                <div
                  key={day.date}
                  className="bg-card/50 rounded-lg border border-border overflow-hidden"
                >
                  {/* Day Header */}
                  <div className="bg-amber-500/10 px-4 py-3 border-b border-border flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {format(new Date(day.date), 'EEEE, d MMMM', { locale: ro })}
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {day.count} itemi - recomandat max 5
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleIgnoreDay(day.date)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Ignoră
                    </Button>
                  </div>

                  {/* Items List */}
                  <div className="p-4 space-y-3">
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className={`bg-background/50 rounded-lg p-3 border-l-4 ${getPriorityColor(item)} border border-border`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getItemIcon(item)}
                            <span className="font-medium truncate">{item.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatItemTime(item)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {/* Quick reschedule buttons with preview */}
                          {getSuggestedDates(day.date).map((suggested, idx) => (
                            <HoverCard key={idx} openDelay={300} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onReschedule(item.id, suggested.date)}
                                  className="text-xs h-7 px-2 group"
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  {suggested.label}
                                  <Eye className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent side="top" align="start" className="p-3">
                                <DestinationPreview targetDate={suggested.date} currentItemId={item.id} />
                              </HoverCardContent>
                            </HoverCard>
                          ))}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onEditItem(item);
                              onOpenChange(false);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Altă dată
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(item.id)}
                            className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Șterge
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI Suggestion */}
                  <div className="px-4 pb-4">
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                      <p className="text-sm text-muted-foreground">
                        💡 <span className="font-medium text-foreground">Sugestie:</span>{' '}
                        Mută sarcinile cu prioritate scăzută în zilele următoare pentru a reduce stresul.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {activeDays.length > 0 && ignoredDays.size > 0 && (
          <div className="p-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              {ignoredDays.size} zi{ignoredDays.size > 1 ? 'le' : ''} ignorat{ignoredDays.size > 1 ? 'e' : 'ă'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
