import { useState } from "react";
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
  X,
  Check,
  Loader2
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
import { VoiceParseResult, VoiceQueryResult, VoicePlanSuggestion, Item, Task, Event, Reminder } from "@/types";
import { cn } from "@/lib/utils";
import { Category } from "@/hooks/useCategories";

interface VoiceConversationalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parseResult: VoiceParseResult | null;
  categories?: Category[];
  onConfirmCreate?: (item: Omit<Item, 'id' | 'createdAt'>) => Promise<void>;
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

const typeLabels = {
  task: "Task",
  event: "Eveniment", 
  reminder: "Reminder",
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
  categories = [],
  onConfirmCreate,
}: VoiceConversationalModalProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);

  if (!parseResult) return null;

  const isQuery = parseResult.intent === 'query';
  const isPlan = parseResult.intent === 'plan';
  const isCreate = parseResult.intent === 'create';
  const hasItemToCreate = isCreate && parseResult.item?.title;

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

  const buildItemFromParsed = (): Omit<Item, 'id' | 'createdAt'> | null => {
    if (!parseResult.item?.title || !parseResult.item?.type) return null;

    const { item } = parseResult;

    if (item.type === 'task') {
      return {
        type: 'task',
        title: item.title,
        deadline: item.deadline ? new Date(item.deadline) : new Date(),
        priority: item.priority || 'medium',
        completed: false,
        duration: item.duration,
        categoryId: item.categoryId,
      } as Omit<Task, 'id' | 'createdAt'>;
    }

    if (item.type === 'event') {
      return {
        type: 'event',
        title: item.title,
        startTime: item.startTime ? new Date(item.startTime) : new Date(),
        duration: item.duration || 60,
        synced: false,
      } as Omit<Event, 'id' | 'createdAt'>;
    }

    if (item.type === 'reminder') {
      return {
        type: 'reminder',
        title: item.title,
        time: item.time ? new Date(item.time) : new Date(),
        notified: false,
      } as Omit<Reminder, 'id' | 'createdAt'>;
    }

    return null;
  };

  const handleConfirmCreate = async () => {
    if (!onConfirmCreate) return;
    
    const itemToCreate = buildItemFromParsed();
    if (!itemToCreate) return;

    setIsCreating(true);
    try {
      await onConfirmCreate(itemToCreate);
      setCreated(true);
      setTimeout(() => {
        onOpenChange(false);
        setCreated(false);
      }, 1500);
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCreated(false);
  };

  const getDialogTitle = () => {
    if (isCreate) return "Confirmare comandă";
    if (isQuery) return "Răspuns la întrebare";
    return "Sfat de organizare";
  };

  const TypeIcon = parseResult.item?.type ? typeIcons[parseResult.item.type] : MessageCircle;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCreate ? (
              <TypeIcon className="h-5 w-5 text-primary" />
            ) : (
              <MessageCircle className="h-5 w-5 text-primary" />
            )}
            {getDialogTitle()}
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

            {/* Item to Create Preview */}
            {hasItemToCreate && parseResult.item && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TypeIcon className="h-4 w-4" />
                  {typeLabels[parseResult.item.type]} de creat
                </h4>
                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{parseResult.item.title}</span>
                    {parseResult.item.priority && (
                      <Badge className={cn("text-xs", priorityConfig[parseResult.item.priority]?.color)}>
                        {priorityConfig[parseResult.item.priority]?.label}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {parseResult.item.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatItemDate(parseResult.item.deadline)} la {formatItemTime(parseResult.item.deadline)}
                      </span>
                    )}
                    {parseResult.item.startTime && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatItemDate(parseResult.item.startTime)} la {formatItemTime(parseResult.item.startTime)}
                      </span>
                    )}
                    {parseResult.item.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatItemDate(parseResult.item.time)} la {formatItemTime(parseResult.item.time)}
                      </span>
                    )}
                    {parseResult.item.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {parseResult.item.duration} min
                      </span>
                    )}
                    {parseResult.item.categoryId && (
                      <span className="flex items-center gap-1">
                        <Flag className="h-3 w-3" />
                        {categories.find(c => c.id === parseResult.item?.categoryId)?.name || 'Categorie'}
                      </span>
                    )}
                  </div>
                </div>
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
                    const ItemTypeIcon = typeIcons[item.type as keyof typeof typeIcons] || Calendar;
                    return (
                      <div
                        key={item.id || index}
                        className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
                      >
                        <ItemTypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
            {isQuery && (!parseResult.queryResults || parseResult.queryResults.length === 0) && !parseResult.conversationalResponse && (
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

        <div className="flex justify-end gap-2 pt-2">
          {hasItemToCreate && onConfirmCreate && (
            <Button 
              onClick={handleConfirmCreate} 
              disabled={isCreating || created}
              className="gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Se creează...
                </>
              ) : created ? (
                <>
                  <Check className="h-4 w-4" />
                  Creat!
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmă și adaugă
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-1" />
            Închide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
