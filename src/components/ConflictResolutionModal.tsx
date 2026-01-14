import { useState } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { AlertTriangle, Clock, Calendar, X, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Event } from "@/types";
import { cn } from "@/lib/utils";

export interface ConflictPair {
  event1: Event;
  event2: Event;
  overlapMinutes: number;
}

interface ConflictResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictPair[];
  onReschedule: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  onIgnore: (conflictIndex: number) => void;
}

export const ConflictResolutionModal = ({
  open,
  onOpenChange,
  conflicts,
  onReschedule,
  onDelete,
  onIgnore,
}: ConflictResolutionModalProps) => {
  const [ignoredConflicts, setIgnoredConflicts] = useState<Set<number>>(new Set());

  const activeConflicts = conflicts.filter((_, index) => !ignoredConflicts.has(index));

  const handleIgnore = (index: number) => {
    setIgnoredConflicts(prev => new Set([...prev, index]));
    onIgnore(index);
  };

  const formatEventTime = (event: Event) => {
    const start = new Date(event.startTime);
    const end = new Date(start.getTime() + event.duration * 60000);
    return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
  };

  const formatEventDate = (event: Event) => {
    return format(new Date(event.startTime), "d MMMM", { locale: ro });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Conflicte Detectate ({activeConflicts.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {conflicts.map((conflict, index) => {
              const isIgnored = ignoredConflicts.has(index);
              
              return (
                <div
                  key={index}
                  className={cn(
                    "rounded-lg border p-4 transition-all",
                    isIgnored
                      ? "opacity-50 bg-muted/30 border-muted"
                      : "bg-card border-destructive/30"
                  )}
                >
                  {/* Conflict Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatEventDate(conflict.event1)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                      ⚡ {conflict.overlapMinutes} min suprapunere
                    </span>
                  </div>

                  {/* Event 1 */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 mb-2">
                    <div className="flex-shrink-0 w-1 h-10 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conflict.event1.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatEventTime(conflict.event1)}
                      </div>
                    </div>
                    {!isIgnored && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={() => onReschedule(conflict.event1.id)}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Reprogramează
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => onDelete(conflict.event1.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Overlap indicator */}
                  <div className="flex items-center justify-center my-1">
                    <div className="flex-1 border-t border-dashed border-destructive/30" />
                    <ChevronRight className="h-4 w-4 text-destructive/50 rotate-90" />
                    <div className="flex-1 border-t border-dashed border-destructive/30" />
                  </div>

                  {/* Event 2 */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 mt-2">
                    <div className="flex-shrink-0 w-1 h-10 rounded-full bg-accent" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conflict.event2.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatEventTime(conflict.event2)}
                      </div>
                    </div>
                    {!isIgnored && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={() => onReschedule(conflict.event2.id)}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Reprogramează
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => onDelete(conflict.event2.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Ignore button */}
                  {!isIgnored && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => handleIgnore(index)}
                      >
                        Ignoră acest conflict
                      </Button>
                    </div>
                  )}

                  {isIgnored && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Conflict ignorat
                    </p>
                  )}
                </div>
              );
            })}

            {activeConflicts.length === 0 && conflicts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Toate conflictele au fost rezolvate sau ignorate! 🎉
                </p>
              </div>
            )}

            {conflicts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nu există conflicte de programare.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Închide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
