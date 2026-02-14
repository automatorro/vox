import { useState, useCallback } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Coffee,
  Sparkles,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Item, Task, Event as EventType } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SmartSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  productivityData?: {
    mostProductiveHour?: number;
    averageFocusMinutes?: number;
    streakDays?: number;
  };
  onAcceptBlock?: (itemId: string, startTime: string, endTime: string) => void;
}

interface TimeBlock {
  itemId: string | null;
  title: string;
  type: "task" | "break" | "buffer";
  startTime: string; // "HH:MM"
  endTime: string;
  durationMinutes: number;
  reason: string;
  accepted?: boolean;
  rejected?: boolean;
}

interface ScheduleResult {
  timeBlocks: TimeBlock[];
  insights: string[];
  freeSlots: Array<{ start: string; end: string; durationMinutes: number }>;
}

export const SmartScheduler = ({
  open,
  onOpenChange,
  items,
  productivityData,
  onAcceptBlock,
}: SmartSchedulerProps) => {
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const itemsData = items.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        deadline: item.type === "task" ? ((item as Task).deadline instanceof Date ? (item as Task).deadline.toISOString() : (item as Task).deadline) : undefined,
        startTime: item.type === "event" ? ((item as EventType).startTime instanceof Date ? (item as EventType).startTime.toISOString() : (item as EventType).startTime) : undefined,
        time: item.type === "reminder" ? ((item as any).time instanceof Date ? (item as any).time.toISOString() : (item as any).time) : undefined,
        priority: item.type === "task" ? (item as Task).priority : undefined,
        completed: item.type === "task" ? (item as Task).completed : undefined,
        duration: item.type === "event" ? (item as EventType).duration : (item as any).duration,
      }));

      const now = new Date();

      const { data, error: invokeError } = await supabase.functions.invoke("smart-scheduler", {
        body: {
          items: itemsData,
          productivityData,
          localHour: now.getHours(),
          timezoneOffset: now.getTimezoneOffset(),
        },
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);

      setSchedule(data);
    } catch (err) {
      console.error("Smart scheduler error:", err);
      setError(err instanceof Error ? err.message : "Nu am putut genera programul");
    } finally {
      setIsLoading(false);
    }
  }, [items, productivityData]);

  const handleAccept = (block: TimeBlock) => {
    if (!block.itemId || !onAcceptBlock) return;

    // Build today's date with the suggested time
    const today = new Date();
    const [hours, minutes] = block.startTime.split(":").map(Number);
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    const [endH, endM] = block.endTime.split(":").map(Number);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM);

    onAcceptBlock(block.itemId, startDate.toISOString(), endDate.toISOString());

    setSchedule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        timeBlocks: prev.timeBlocks.map((b) =>
          b === block ? { ...b, accepted: true, rejected: false } : b
        ),
      };
    });

    toast({
      title: "Bloc acceptat! ✅",
      description: `"${block.title}" programat la ${block.startTime}`,
    });
  };

  const handleReject = (block: TimeBlock) => {
    setSchedule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        timeBlocks: prev.timeBlocks.map((b) =>
          b === block ? { ...b, rejected: true, accepted: false } : b
        ),
      };
    });
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "task": return Clock;
      case "break": return Coffee;
      case "buffer": return ArrowRight;
      default: return Clock;
    }
  };

  const getBlockColor = (block: TimeBlock) => {
    if (block.accepted) return "border-green-500/50 bg-green-500/10";
    if (block.rejected) return "border-muted/30 bg-muted/10 opacity-50";
    if (block.type === "break") return "border-amber-500/30 bg-amber-500/5";
    if (block.type === "buffer") return "border-border/30 bg-muted/5";
    return "border-primary/30 bg-primary/5";
  };

  // Auto-generate on open
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !schedule && !isLoading) {
      generateSchedule();
    }
    onOpenChange(isOpen);
  };

  const acceptedCount = schedule?.timeBlocks.filter((b) => b.accepted).length ?? 0;
  const taskBlocks = schedule?.timeBlocks.filter((b) => b.type === "task") ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Scheduler
            {taskBlocks.length > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                {acceptedCount}/{taskBlocks.length} acceptate
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                AI analizează programul tău...
              </div>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={generateSchedule}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Încearcă din nou
              </Button>
            </div>
          ) : schedule ? (
            <div className="space-y-4 py-2">
              {/* Timeline */}
              <div className="space-y-2">
                {schedule.timeBlocks.map((block, index) => {
                  const BlockIcon = getBlockIcon(block.type);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-xl border p-3 transition-all",
                        getBlockColor(block)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
                          <span className="text-xs font-mono font-medium">{block.startTime}</span>
                          <div className="w-px h-3 bg-border" />
                          <span className="text-xs font-mono text-muted-foreground">{block.endTime}</span>
                        </div>

                        <div className={cn(
                          "p-1.5 rounded-lg flex-shrink-0",
                          block.type === "task" ? "bg-primary/20" :
                          block.type === "break" ? "bg-amber-500/20" : "bg-muted/30"
                        )}>
                          <BlockIcon className={cn(
                            "h-4 w-4",
                            block.type === "task" ? "text-primary" :
                            block.type === "break" ? "text-amber-400" : "text-muted-foreground"
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            block.rejected && "line-through text-muted-foreground"
                          )}>
                            {block.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{block.reason}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {block.durationMinutes} min
                          </Badge>
                        </div>

                        {block.type === "task" && !block.accepted && !block.rejected && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => handleAccept(block)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(block)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {block.accepted && (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Free Slots */}
              {schedule.freeSlots && schedule.freeSlots.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Intervale libere
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {schedule.freeSlots.map((slot, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {slot.start} - {slot.end} ({slot.durationMinutes} min)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {schedule.insights && schedule.insights.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lightbulb className="h-4 w-4" />
                    Observații
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {schedule.insights.map((insight, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {insight}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </ScrollArea>

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSchedule}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Regenerează
          </Button>
          <Button onClick={() => onOpenChange(false)}>Închide</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
