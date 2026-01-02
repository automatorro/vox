import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { 
  MessageCircle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Flag,
  Lightbulb,
  ArrowRight,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VoiceParseResult, VoiceQueryResult, VoicePlanSuggestion } from "@/types";
import { cn } from "@/lib/utils";

interface VoiceConversationalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parseResult: VoiceParseResult | null;
}

const priorityConfig = {
  low: { label: "Scăzută", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medie", color: "bg-blue-500/20 text-blue-400" },
  high: { label: "Mare", color: "bg-orange-500/20 text-orange-400" },
  critical: { label: "Urgentă", color: "bg-destructive/20 text-destructive" },
};

const typeIcons = {
  task: CheckCircle2,
  event: Calendar,
  reminder: Clock,
};

const actionLabels: Record<VoicePlanSuggestion['action'], { label: string; color: string }> = {
  'do first': { label: "Fă prima dată", color: "bg-green-500/20 text-green-400" },
  'postpone': { label: "Amână", color: "bg-yellow-500/20 text-yellow-400" },
  'delegate': { label: "Delegă", color: "bg-purple-500/20 text-purple-400" },
  'break down': { label: "Împarte", color: "bg-blue-500/20 text-blue-400" },
  'time block': { label: "Bloc de timp", color: "bg-orange-500/20 text-orange-400" },
};

export const VoiceConversationalModal = ({
  open,
  onOpenChange,
  parseResult,
}: VoiceConversationalModalProps) => {
  if (!parseResult) return null;

  const isQuery = parseResult.intent === 'query';
  const isPlan = parseResult.intent === 'plan';

  const formatItemTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return format(date, "HH:mm", { locale: ro });
    } catch {
      return timeStr;
    }
  };

  const formatItemDate = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return format(date, "EEEE, d MMM", { locale: ro });
    } catch {
      return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            {isQuery ? "Răspuns la întrebare" : "Sfat de organizare"}
          </DialogTitle>
          <DialogDescription>
            "{parseResult.transcript}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 py-2">
            {/* Conversational Response */}
            {parseResult.conversationalResponse && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm leading-relaxed">
                  {parseResult.conversationalResponse}
                </p>
              </div>
            )}

            {/* Query Results - Items found */}
            {isQuery && parseResult.queryResults && parseResult.queryResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Programări găsite
                </h4>
                <div className="space-y-2">
                  {parseResult.queryResults.map((item, index) => {
                    const TypeIcon = typeIcons[item.type as keyof typeof typeIcons] || Calendar;
                    return (
                      <div
                        key={item.id || index}
                        className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
                      >
                        <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatItemDate(item.time)} la {formatItemTime(item.time)}
                          </p>
                        </div>
                        {item.priority && (
                          <Badge 
                            className={cn(
                              "text-xs flex-shrink-0",
                              priorityConfig[item.priority as keyof typeof priorityConfig]?.color
                            )}
                          >
                            {priorityConfig[item.priority as keyof typeof priorityConfig]?.label}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Query Results - Nothing found */}
            {isQuery && (!parseResult.queryResults || parseResult.queryResults.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nu am găsit nimic programat.</p>
              </div>
            )}

            {/* Plan Suggestions */}
            {isPlan && parseResult.planSuggestions && parseResult.planSuggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Sugestii de organizare
                </h4>
                <div className="space-y-2">
                  {parseResult.planSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border bg-card/50 p-3"
                    >
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">
                        {suggestion.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-xs", actionLabels[suggestion.action]?.color)}>
                            {actionLabels[suggestion.action]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional AI Suggestions */}
            {parseResult.suggestions && parseResult.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Sugestii suplimentare
                </h4>
                {parseResult.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-md p-3 text-sm bg-primary/10 text-primary"
                  >
                    <Flag className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{suggestion.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Închide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
