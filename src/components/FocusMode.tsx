import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, SkipForward, Target, Coffee, Flame, Settings2, X, Timer, Check } from "lucide-react";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { usePomodoroTimer, PomodoroPhase } from "@/hooks/usePomodoroTimer";
import { cn } from "@/lib/utils";

interface FocusModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onCompleteTask?: (taskId: string) => void;
}

const phaseConfig: Record<PomodoroPhase, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  idle: { label: 'Pregătit', color: 'text-muted-foreground', icon: <Target className="h-6 w-6" />, bg: 'bg-muted' },
  work: { label: 'Focus', color: 'text-task', icon: <Flame className="h-6 w-6" />, bg: 'bg-task/20' },
  shortBreak: { label: 'Pauză scurtă', color: 'text-event', icon: <Coffee className="h-6 w-6" />, bg: 'bg-event/20' },
  longBreak: { label: 'Pauză lungă', color: 'text-primary', icon: <Coffee className="h-6 w-6" />, bg: 'bg-primary/20' },
};

export const FocusMode = ({ open, onOpenChange, tasks, onCompleteTask }: FocusModeProps) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [taskTimeTracking, setTaskTimeTracking] = useState<Record<string, number>>({});

  const {
    timeRemaining,
    phase,
    isRunning,
    completedSessions,
    totalTimeWorked,
    settings,
    start,
    pause,
    reset,
    skip,
    updateSettings,
  } = usePomodoroTimer();

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const incompleteTasks = tasks.filter(t => !t.completed);

  // Track time per task
  useEffect(() => {
    if (isRunning && phase === 'work' && selectedTaskId) {
      const interval = setInterval(() => {
        setTaskTimeTracking(prev => ({
          ...prev,
          [selectedTaskId]: (prev[selectedTaskId] || 0) + 1,
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRunning, phase, selectedTaskId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getProgress = () => {
    let totalDuration = settings.workDuration * 60;
    if (phase === 'shortBreak') totalDuration = settings.shortBreakDuration * 60;
    if (phase === 'longBreak') totalDuration = settings.longBreakDuration * 60;
    return ((totalDuration - timeRemaining) / totalDuration) * 100;
  };

  const handleCompleteTask = () => {
    if (selectedTaskId && onCompleteTask) {
      onCompleteTask(selectedTaskId);
      setSelectedTaskId(null);
      pause();
      reset();
    }
  };

  const currentPhase = phaseConfig[phase];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Focus Mode
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          {/* Timer Section */}
          <div className={cn("px-6 py-8 flex flex-col items-center transition-colors", currentPhase.bg)}>
            {/* Phase indicator */}
            <div className={cn("flex items-center gap-2 mb-4", currentPhase.color)}>
              {currentPhase.icon}
              <span className="font-medium">{currentPhase.label}</span>
            </div>

            {/* Circular progress timer */}
            <div className="relative w-48 h-48 mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/30"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - getProgress() / 100)}
                  className={cn(
                    "transition-all duration-1000",
                    phase === 'work' ? 'text-task' : phase === 'idle' ? 'text-muted-foreground' : 'text-event'
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-mono font-bold">{formatTime(timeRemaining)}</span>
                {selectedTask && (
                  <span className="text-sm text-muted-foreground mt-2 max-w-[140px] truncate text-center">
                    {selectedTask.title}
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={reset}
                disabled={phase === 'idle' && !isRunning}
                className="h-10 w-10"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
              
              <Button
                variant={isRunning ? "outline" : "default"}
                size="lg"
                onClick={isRunning ? pause : start}
                disabled={!selectedTaskId && phase === 'idle'}
                className="h-14 w-14 rounded-full"
              >
                {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={skip}
                disabled={phase === 'idle'}
                className="h-10 w-10"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg">{completedSessions}</div>
                <div className="text-muted-foreground">Sesiuni</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="font-semibold text-lg">{formatDuration(totalTimeWorked)}</div>
                <div className="text-muted-foreground">Timp focus</div>
              </div>
              {selectedTaskId && taskTimeTracking[selectedTaskId] > 0 && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="font-semibold text-lg">{formatDuration(taskTimeTracking[selectedTaskId])}</div>
                    <div className="text-muted-foreground">Pe task</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Task Selection or Settings */}
          <div className="px-6 py-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">
                {showSettings ? 'Setări Timer' : 'Selectează un task'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                {showSettings ? <X className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
              </Button>
            </div>

            {showSettings ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Focus</span>
                    <span className="text-muted-foreground">{settings.workDuration} min</span>
                  </div>
                  <Slider
                    value={[settings.workDuration]}
                    onValueChange={([val]) => updateSettings({ workDuration: val })}
                    min={5}
                    max={60}
                    step={5}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Pauză scurtă</span>
                    <span className="text-muted-foreground">{settings.shortBreakDuration} min</span>
                  </div>
                  <Slider
                    value={[settings.shortBreakDuration]}
                    onValueChange={([val]) => updateSettings({ shortBreakDuration: val })}
                    min={1}
                    max={15}
                    step={1}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Pauză lungă</span>
                    <span className="text-muted-foreground">{settings.longBreakDuration} min</span>
                  </div>
                  <Slider
                    value={[settings.longBreakDuration]}
                    onValueChange={([val]) => updateSettings({ longBreakDuration: val })}
                    min={10}
                    max={30}
                    step={5}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Sesiuni până la pauza lungă</span>
                    <span className="text-muted-foreground">{settings.sessionsBeforeLongBreak}</span>
                  </div>
                  <Slider
                    value={[settings.sessionsBeforeLongBreak]}
                    onValueChange={([val]) => updateSettings({ sessionsBeforeLongBreak: val })}
                    min={2}
                    max={6}
                    step={1}
                  />
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[200px] -mx-2">
                <div className="space-y-2 px-2">
                  {incompleteTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nu ai task-uri active</p>
                    </div>
                  ) : (
                    incompleteTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                          selectedTaskId === task.id
                            ? "bg-task/20 border-2 border-task"
                            : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex-shrink-0",
                          selectedTaskId === task.id ? "border-task bg-task" : "border-muted-foreground"
                        )}>
                          {selectedTaskId === task.id && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{task.title}</div>
                          {taskTimeTracking[task.id] && (
                            <div className="text-xs text-muted-foreground">
                              <Timer className="h-3 w-3 inline mr-1" />
                              {formatDuration(taskTimeTracking[task.id])} lucrat
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Complete task button */}
            {selectedTask && (
              <Button
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={handleCompleteTask}
              >
                <Check className="h-4 w-4" />
                Marchează "{selectedTask.title}" ca finalizat
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
