import { useState } from "react";
import { format, addDays } from "date-fns";
import { ro } from "date-fns/locale";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Check, Calendar, Clock, Target, Lightbulb } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types";

interface Subtask {
  title: string;
  duration: number;
  priority: "low" | "medium" | "high";
  deadline: string;
  order: number;
  selected?: boolean;
}

interface Milestone {
  title: string;
  description: string;
  deadline: string;
  order: number;
  subtasks: Subtask[];
  expanded?: boolean;
}

interface ProjectBreakdown {
  projectTitle: string;
  milestones: Milestone[];
  totalEstimatedHours: number;
  confidence: number;
  tips: string[];
}

interface ProjectBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTasks: (tasks: Omit<Task, "id" | "completed">[]) => void;
}

export const ProjectBreakdownModal = ({
  open,
  onOpenChange,
  onCreateTasks,
}: ProjectBreakdownModalProps) => {
  const [projectGoal, setProjectGoal] = useState("");
  const [targetDeadline, setTargetDeadline] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<ProjectBreakdown | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!projectGoal.trim()) {
      toast({
        title: "Eroare",
        description: "Introdu descrierea proiectului",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setBreakdown(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-project-breakdown", {
        body: {
          projectGoal,
          targetDeadline,
          availableHoursPerDay: hoursPerDay,
          language: "RO",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setBreakdown(data);
      
      // Expand all milestones and select all subtasks by default
      const allExpanded = new Set<number>();
      const allSelected = new Set<string>();
      
      data.milestones?.forEach((m: Milestone, mIdx: number) => {
        allExpanded.add(mIdx);
        m.subtasks?.forEach((_: Subtask, sIdx: number) => {
          allSelected.add(`${mIdx}-${sIdx}`);
        });
      });
      
      setExpandedMilestones(allExpanded);
      setSelectedSubtasks(allSelected);

      toast({
        title: "Plan generat! 🎯",
        description: `${data.milestones?.length || 0} milestones cu ${data.milestones?.reduce((acc: number, m: Milestone) => acc + (m.subtasks?.length || 0), 0) || 0} subtask-uri`,
      });
    } catch (error) {
      console.error("Error generating breakdown:", error);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut genera planul",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMilestone = (idx: number) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedMilestones(newExpanded);
  };

  const toggleSubtask = (milestoneIdx: number, subtaskIdx: number) => {
    const key = `${milestoneIdx}-${subtaskIdx}`;
    const newSelected = new Set(selectedSubtasks);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedSubtasks(newSelected);
  };

  const handleCreateTasks = () => {
    if (!breakdown) return;

    const tasksToCreate: Omit<Task, "id" | "completed">[] = [];

    breakdown.milestones.forEach((milestone, mIdx) => {
      milestone.subtasks?.forEach((subtask, sIdx) => {
        const key = `${mIdx}-${sIdx}`;
        if (selectedSubtasks.has(key)) {
          tasksToCreate.push({
            type: "task",
            title: `[${milestone.title}] ${subtask.title}`,
            deadline: new Date(subtask.deadline),
            priority: subtask.priority,
            duration: subtask.duration,
            description: `Parte din proiectul: ${breakdown.projectTitle}\nMilestone: ${milestone.title}`,
          });
          });
        }
      });
    });

    if (tasksToCreate.length === 0) {
      toast({
        title: "Selectează subtask-uri",
        description: "Bifează cel puțin un subtask pentru a crea task-uri",
        variant: "destructive",
      });
      return;
    }

    onCreateTasks(tasksToCreate);
    
    toast({
      title: "Task-uri create! ✅",
      description: `${tasksToCreate.length} task-uri adăugate în lista ta`,
    });

    // Reset state
    setBreakdown(null);
    setProjectGoal("");
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/20 text-destructive border-destructive/30";
      case "medium": return "bg-primary/20 text-primary border-primary/30";
      default: return "bg-muted text-muted-foreground border-muted";
    }
  };

  const selectedCount = selectedSubtasks.size;
  const totalSubtasks = breakdown?.milestones?.reduce(
    (acc, m) => acc + (m.subtasks?.length || 0), 0
  ) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            AI Project Breakdown
          </SheetTitle>
          <SheetDescription>
            Spune-mi obiectivul tău mare și îl voi descompune în pași acționabili
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          {!breakdown ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-goal">Ce vrei să realizezi?</Label>
                <Textarea
                  id="project-goal"
                  placeholder="Ex: Vreau să lansez un blog personal, să învăț să cânt la chitară, să îmi renovez bucătăria..."
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline țintă</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={targetDeadline}
                    onChange={(e) => setTargetDeadline(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Ore/zi disponibile</Label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={12}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleGenerate}
                disabled={isLoading || !projectGoal.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generez planul...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generează Plan
                  </>
                )}
              </Button>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Exemple de proiecte:
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• "Vreau să lansez un magazin online"</li>
                  <li>• "Trebuie să mă pregătesc pentru un interviu tehnic"</li>
                  <li>• "Vreau să scriu o carte de 200 de pagini"</li>
                  <li>• "Mă mut în alt oraș luna viitoare"</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Project Header */}
              <div className="bg-card border rounded-xl p-4">
                <h3 className="font-semibold text-lg">{breakdown.projectTitle}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Deadline: {format(new Date(targetDeadline), "d MMM yyyy", { locale: ro })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    ~{breakdown.totalEstimatedHours}h total
                  </span>
                  <Badge variant="outline" className="text-primary">
                    {Math.round(breakdown.confidence * 100)}% confidence
                  </Badge>
                </div>
              </div>

              {/* Tips */}
              {breakdown.tips && breakdown.tips.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                    <Lightbulb className="h-4 w-4" />
                    Sfaturi pentru succes:
                  </div>
                  <ul className="text-sm space-y-1 text-foreground/80">
                    {breakdown.tips.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Milestones */}
              <div className="space-y-3">
                {breakdown.milestones?.map((milestone, mIdx) => (
                  <Collapsible
                    key={mIdx}
                    open={expandedMilestones.has(mIdx)}
                    onOpenChange={() => toggleMilestone(mIdx)}
                  >
                    <div className="border rounded-xl overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                          {expandedMilestones.has(mIdx) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{milestone.title}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {milestone.description}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {format(new Date(milestone.deadline), "d MMM", { locale: ro })}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 p-3 space-y-2">
                          {milestone.subtasks?.map((subtask, sIdx) => {
                            const key = `${mIdx}-${sIdx}`;
                            const isSelected = selectedSubtasks.has(key);
                            return (
                              <div
                                key={sIdx}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                  isSelected ? "bg-card border-primary/30" : "bg-background hover:bg-card"
                                }`}
                                onClick={() => toggleSubtask(mIdx, sIdx)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSubtask(mIdx, sIdx)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{subtask.title}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3" />
                                    {subtask.duration}min
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 ${getPriorityColor(subtask.priority)}`}
                                    >
                                      {subtask.priority}
                                    </Badge>
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(subtask.deadline), "d/M")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t -mx-4 px-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedCount} din {totalSubtasks} subtask-uri selectate
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setBreakdown(null)}>
                    Regenerează
                  </Button>
                </div>
                <Button className="w-full gap-2" size="lg" onClick={handleCreateTasks}>
                  <Check className="h-4 w-4" />
                  Creează {selectedCount} Task-uri
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
