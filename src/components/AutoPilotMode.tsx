import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, Play, Pause, RotateCcw, Check, ChevronRight, Trophy, Clock, AlertTriangle, Flame, Coffee, SkipForward } from "lucide-react";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AutoPilotModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onCompleteTask?: (taskId: string) => void;
}

/**
 * Score tasks by urgency (deadline proximity), priority weight, and duration preference.
 * Lower deadline = more urgent. Higher priority = higher score.
 * Shorter tasks get a slight boost for momentum.
 */
const scoreTask = (task: Task): number => {
  const now = new Date();
  const hoursUntilDeadline = Math.max(0, (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

  // Urgency: exponential decay — closer deadline = much higher score
  const urgencyScore = Math.max(0, 100 - hoursUntilDeadline * 2);

  // Priority weight
  const priorityWeights: Record<string, number> = { critical: 40, high: 30, medium: 15, low: 5 };
  const priorityScore = priorityWeights[task.priority] || 10;

  // Duration bonus: shorter tasks get a small momentum boost (max 10 pts for ≤15min)
  const durationMinutes = task.duration || 30;
  const durationBonus = Math.max(0, 10 - durationMinutes / 5);

  return urgencyScore + priorityScore + durationBonus;
};

const sortTasksByAutoPilot = (tasks: Task[]): Task[] => {
  return [...tasks]
    .filter(t => !t.completed)
    .map(t => ({ task: t, score: scoreTask(t) }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.task);
};

type Phase = 'ready' | 'working' | 'paused' | 'completed' | 'allDone';

export const AutoPilotMode = ({ open, onOpenChange, tasks, onCompleteTask }: AutoPilotModeProps) => {
  const [sortedTasks, setSortedTasks] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsed, setElapsed] = useState(0); // seconds
  const [completedCount, setCompletedCount] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Re-sort when tasks change or dialog opens
  useEffect(() => {
    if (open) {
      const sorted = sortTasksByAutoPilot(tasks);
      setSortedTasks(sorted);
      setCurrentIndex(0);
      setPhase(sorted.length > 0 ? 'ready' : 'allDone');
      setElapsed(0);
      setCompletedCount(0);
      setTotalTimeSpent(0);
    }
  }, [open, tasks]);

  // Timer
  useEffect(() => {
    if (phase === 'working') {
      intervalRef.current = setInterval(() => {
        setElapsed(p => p + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const currentTask = sortedTasks[currentIndex];
  const estimatedSeconds = (currentTask?.duration || 30) * 60;
  const progressPercent = Math.min(100, (elapsed / estimatedSeconds) * 100);
  const isOvertime = elapsed > estimatedSeconds;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setPhase('working');
  const handlePause = () => setPhase('paused');
  const handleResume = () => setPhase('working');

  const handleComplete = useCallback(() => {
    if (!currentTask) return;
    const timeSpent = elapsed;
    setTotalTimeSpent(p => p + timeSpent);
    setCompletedCount(p => p + 1);
    onCompleteTask?.(currentTask.id);

    // Advance to next
    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedTasks.length) {
      setCurrentIndex(nextIndex);
      setElapsed(0);
      setPhase('ready');
    } else {
      setPhase('allDone');
    }
  }, [currentTask, currentIndex, sortedTasks.length, elapsed, onCompleteTask]);

  const handleSkip = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedTasks.length) {
      setCurrentIndex(nextIndex);
      setElapsed(0);
      setPhase('ready');
    } else {
      setPhase('allDone');
    }
  }, [currentIndex, sortedTasks.length]);

  const priorityConfig: Record<string, { label: string; class: string }> = {
    critical: { label: 'Critic', class: 'bg-destructive/20 text-destructive' },
    high: { label: 'Ridicat', class: 'bg-task/20 text-task' },
    medium: { label: 'Mediu', class: 'bg-event/20 text-event' },
    low: { label: 'Scăzut', class: 'bg-muted text-muted-foreground' },
  };

  // All done screen
  if (phase === 'allDone') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden" aria-describedby={undefined}>
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-gradient-to-b from-primary/10 to-background">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-pulse">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Toate task-urile sunt gata! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              Ai finalizat <span className="font-semibold text-foreground">{completedCount}</span> task-uri
              în <span className="font-semibold text-foreground">{formatTime(totalTimeSpent)}</span>
            </p>
            <Button onClick={() => onOpenChange(false)} size="lg">
              Închide
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" aria-describedby={undefined}>
        {/* Header strip */}
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">Auto-Pilot</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{currentIndex + 1} / {sortedTasks.length}</span>
            <span>•</span>
            <span>{completedCount} finalizate</span>
          </div>
        </div>

        {currentTask && (
          <div className="flex flex-col">
            {/* Current task display */}
            <div className={cn(
              "px-8 py-10 flex flex-col items-center text-center transition-colors",
              phase === 'working' ? 'bg-task/10' : phase === 'paused' ? 'bg-event/10' : 'bg-muted/30'
            )}>
              {/* Priority badge */}
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium mb-4",
                priorityConfig[currentTask.priority]?.class
              )}>
                {priorityConfig[currentTask.priority]?.label}
              </span>

              {/* Task title */}
              <h2 className="text-2xl font-bold mb-2 max-w-sm">{currentTask.title}</h2>
              {currentTask.description && (
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">{currentTask.description}</p>
              )}

              {/* Timer */}
              <div className="mb-4 w-full max-w-xs">
                <div className={cn(
                  "text-5xl font-mono font-bold mb-2 tabular-nums",
                  isOvertime ? "text-destructive" : "text-foreground"
                )}>
                  {formatTime(elapsed)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Clock className="h-3 w-3" />
                  <span>Estimat: {currentTask.duration || 30} min</span>
                  {isOvertime && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Depășit!
                    </span>
                  )}
                </div>
                <Progress
                  value={progressPercent}
                  className={cn("h-2", isOvertime && "[&>div]:bg-destructive")}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {phase === 'ready' && (
                  <Button size="lg" onClick={handleStart} className="gap-2 h-14 px-8 rounded-full">
                    <Play className="h-5 w-5" />
                    Start
                  </Button>
                )}
                {phase === 'working' && (
                  <Button variant="outline" size="lg" onClick={handlePause} className="gap-2 h-14 px-8 rounded-full">
                    <Pause className="h-5 w-5" />
                    Pauză
                  </Button>
                )}
                {phase === 'paused' && (
                  <Button size="lg" onClick={handleResume} className="gap-2 h-14 px-8 rounded-full">
                    <Play className="h-5 w-5" />
                    Continuă
                  </Button>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div className="px-6 py-4 border-t flex items-center gap-3">
              <Button
                variant="default"
                className="flex-1 gap-2"
                onClick={handleComplete}
                disabled={phase === 'ready'}
              >
                <Check className="h-4 w-4" />
                Gata — Următorul
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                title="Sari peste acest task"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Up next preview */}
            {currentIndex + 1 < sortedTasks.length && (
              <div className="px-6 pb-4">
                <div className="text-xs text-muted-foreground mb-2">Următorul:</div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{sortedTasks[currentIndex + 1].title}</div>
                    <div className="text-xs text-muted-foreground">
                      {sortedTasks[currentIndex + 1].duration || 30} min • {priorityConfig[sortedTasks[currentIndex + 1].priority]?.label}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
