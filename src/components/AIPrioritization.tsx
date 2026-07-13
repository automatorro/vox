import { useState } from "react";
import { Sparkles, Loader2, ArrowRight, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AIPrioritizationProps {
  tasks: Task[];
  onReorder: (orderedIds: string[]) => void;
}

interface PrioritizationResult {
  orderedTaskIds: string[];
  reasoning: string;
  tips: string[];
}

export const AIPrioritization = ({ tasks, onReorder }: AIPrioritizationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PrioritizationResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // STRICT: exclude completed tasks — AI prioritization is only useful for pending work
  const incompleteTasks = tasks.filter(t => t.completed !== true);
  const completedCount = tasks.length - incompleteTasks.length;

  const handleAnalyze = async () => {
    if (incompleteTasks.length === 0) {
      toast({
        title: "Nu ai taskuri active de priorizat",
        description: completedCount > 0
          ? `Toate cele ${completedCount} taskuri sunt deja finalizate. Felicitări! 🎉`
          : "Adaugă taskuri pentru a folosi prioritizarea AI",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-prioritize', {
        body: {
          tasks: incompleteTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            deadline: t.deadline,
            duration: t.duration || 30,
          }))
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Extra safety: filter any ids returned by AI to only include incomplete tasks
      const incompleteIds = new Set(incompleteTasks.map(t => t.id));
      const safeData: PrioritizationResult = {
        ...data,
        orderedTaskIds: (data.orderedTaskIds || []).filter((id: string) => incompleteIds.has(id)),
      };
      setResult(safeData);
      setIsExpanded(true);

      toast({
        title: "Analiză completă! ✨",
        description: "AI-ul a prioritizat taskurile tale",
      });

    } catch (error) {
      console.error("AI prioritization error:", error);
      toast({
        title: "Eroare la prioritizare",
        description: error instanceof Error ? error.message : "Încearcă din nou",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (result?.orderedTaskIds) {
      onReorder(result.orderedTaskIds);
      toast({
        title: "Ordine aplicată! 🎯",
        description: "Taskurile au fost reordonate după sugestia AI",
      });
      setIsExpanded(false);
    }
  };

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const priorityColors: Record<string, string> = {
    low: "bg-emerald-500/20 text-emerald-400",
    medium: "bg-amber-500/20 text-amber-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  };

  if (incompleteTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAnalyze}
        disabled={isLoading}
        className="w-full gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analizez taskurile...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Prioritizare AI ({incompleteTasks.length} {incompleteTasks.length === 1 ? 'task activ' : 'taskuri active'})
          </>
        )}
      </Button>

      {/* Results Panel */}
      {result && isExpanded && (
        <div className="rounded-xl border border-primary/20 bg-card/80 backdrop-blur-sm p-4 space-y-4 animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Ordinea recomandată
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Ordered Tasks */}
          <div className="space-y-2">
            {result.orderedTaskIds.map((id, index) => {
              const task = getTaskById(id);
              if (!task) return null;
              
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                >
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm truncate">{task.title}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    priorityColors[task.priority]
                  )}>
                    {task.priority}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reasoning */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p>{result.reasoning}</p>
          </div>

          {/* Tips */}
          {result.tips && result.tips.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Sfaturi
              </h5>
              <ul className="space-y-1">
                {result.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 text-primary" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply Button */}
          <Button
            onClick={handleApply}
            className="w-full gap-2"
            size="sm"
          >
            <ArrowRight className="h-4 w-4" />
            Aplică această ordine
          </Button>
        </div>
      )}
    </div>
  );
};
