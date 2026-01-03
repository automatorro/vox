import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { 
  Sun, 
  Moon, 
  CloudSun,
  Target,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  X,
  RefreshCw,
  Calendar
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
import { Item } from "@/types";
import { cn } from "@/lib/utils";

interface MorningSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  userName?: string;
}

interface MorningSummary {
  greeting: string;
  daySummary: string;
  topPriorities: string[];
  suggestions: Array<{ tip: string; detail: string }>;
  motivationalMessage: string;
  alerts: string[];
  metadata?: {
    generatedAt: string;
    todayTasksCount: number;
    todayEventsCount: number;
    upcomingItemsCount: number;
    hasCriticalTasks: boolean;
  };
}

const SUMMARY_CACHE_KEY = 'vox_morning_summary';
const SUMMARY_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

export const MorningSummaryModal = ({
  open,
  onOpenChange,
  items,
  userName
}: MorningSummaryModalProps) => {
  const [summary, setSummary] = useState<MorningSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentHour = new Date().getHours();
  
  const getTimeIcon = () => {
    if (currentHour >= 5 && currentHour < 12) return Sun;
    if (currentHour >= 12 && currentHour < 18) return CloudSun;
    return Moon;
  };
  
  const TimeIcon = getTimeIcon();

  const fetchSummary = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = localStorage.getItem(SUMMARY_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const isValid = Date.now() - timestamp < SUMMARY_CACHE_DURATION;
          const isSameDay = new Date(timestamp).toDateString() === new Date().toDateString();
          
          if (isValid && isSameDay) {
            setSummary(data);
            return;
          }
        } catch (e) {
          localStorage.removeItem(SUMMARY_CACHE_KEY);
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare items data for the edge function
      const itemsData = items.map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        deadline: item.type === 'task' ? (item as any).deadline?.toISOString?.() || (item as any).deadline : undefined,
        startTime: item.type === 'event' ? (item as any).startTime?.toISOString?.() || (item as any).startTime : undefined,
        time: item.type === 'reminder' ? (item as any).time?.toISOString?.() || (item as any).time : undefined,
        priority: item.type === 'task' ? (item as any).priority : undefined,
        completed: item.type === 'task' ? (item as any).completed : undefined,
        duration: item.type === 'event' ? (item as any).duration : undefined,
      }));

      const { data, error: invokeError } = await supabase.functions.invoke('morning-summary', {
        body: { items: itemsData, userName }
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSummary(data);
      
      // Cache the result
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

    } catch (err) {
      console.error('Failed to fetch morning summary:', err);
      setError(err instanceof Error ? err.message : 'Nu am putut genera rezumatul');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && !summary && !isLoading) {
      fetchSummary();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TimeIcon className="h-5 w-5 text-primary" />
            <span>Rezumat AI</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {format(new Date(), 'd MMMM', { locale: ro })}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={() => fetchSummary(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Încearcă din nou
              </Button>
            </div>
          ) : summary ? (
            <div className="space-y-5 py-2">
              {/* Greeting */}
              <div className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 p-4 border border-primary/20">
                <p className="text-lg font-medium">{summary.greeting}</p>
              </div>

              {/* Day Summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Rezumatul zilei
                </div>
                <p className="text-sm leading-relaxed pl-6">
                  {summary.daySummary}
                </p>
              </div>

              {/* Top Priorities */}
              {summary.topPriorities && summary.topPriorities.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Top priorități pentru azi
                  </div>
                  <div className="space-y-2 pl-6">
                    {summary.topPriorities.map((priority, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
                      >
                        <div className={cn(
                          "flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold flex-shrink-0",
                          index === 0 ? "bg-destructive/20 text-destructive" :
                          index === 1 ? "bg-orange-500/20 text-orange-400" :
                          "bg-primary/20 text-primary"
                        )}>
                          {index + 1}
                        </div>
                        <span className="text-sm">{priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {summary.suggestions && summary.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lightbulb className="h-4 w-4" />
                    Sugestii de organizare
                  </div>
                  <div className="space-y-2 pl-6">
                    {summary.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="rounded-lg bg-primary/10 border border-primary/20 p-3"
                      >
                        <p className="text-sm font-medium">{suggestion.tip}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerts */}
              {summary.alerts && summary.alerts.length > 0 && (
                <div className="space-y-2">
                  {summary.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3"
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-destructive">{alert}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Motivational Message */}
              {summary.motivationalMessage && (
                <div className="rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <p className="text-sm italic text-foreground/80">
                      "{summary.motivationalMessage}"
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {summary.metadata && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary" className="text-xs">
                    {summary.metadata.todayTasksCount} taskuri
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {summary.metadata.todayEventsCount} evenimente
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {summary.metadata.upcomingItemsCount} în săptămână
                  </Badge>
                </div>
              )}
            </div>
          ) : null}
        </ScrollArea>

        <div className="flex justify-between pt-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fetchSummary(true)}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Regenerează
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Închide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
