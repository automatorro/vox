import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useSubtasks, Subtask } from "@/hooks/useSubtasks";

interface SubtaskListProps {
  itemId: string;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

export const SubtaskList = ({ itemId, showProgress = true, compact = false, className }: SubtaskListProps) => {
  const {
    subtasks,
    isLoading,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    isCreating,
    progress,
    completedCount,
    totalCount,
  } = useSubtasks(itemId);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    createSubtask({
      item_id: itemId,
      title: newSubtaskTitle.trim(),
      sort_order: subtasks.length,
    });

    setNewSubtaskTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddSubtask();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewSubtaskTitle("");
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Bar */}
      {showProgress && totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progres</span>
            <span>{completedCount}/{totalCount} ({progress}%)</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Subtask List */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            subtask={subtask}
            onToggle={() => toggleSubtask(subtask.id)}
            onDelete={() => deleteSubtask(subtask.id)}
            compact={compact}
          />
        ))}
      </div>

      {/* Add Subtask */}
      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Titlu subtask..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newSubtaskTitle.trim()) {
                setIsAdding(false);
              }
            }}
            className="h-8 text-sm bg-background"
            disabled={isCreating}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddSubtask}
            disabled={!newSubtaskTitle.trim() || isCreating}
            className="h-8 px-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-8 text-muted-foreground hover:text-foreground gap-1 px-2"
        >
          <Plus className="h-4 w-4" />
          Adaugă subtask
        </Button>
      )}
    </div>
  );
};

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: () => void;
  onDelete: () => void;
  compact?: boolean;
}

const SubtaskItem = ({ subtask, onToggle, onDelete, compact }: SubtaskItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg transition-colors",
        compact ? "py-1" : "py-2 px-2 hover:bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!compact && (
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-task data-[state=checked]:border-task"
      />
      
      <span
        className={cn(
          "flex-1 text-sm transition-all",
          subtask.completed && "line-through text-muted-foreground"
        )}
      >
        {subtask.title}
      </span>

      {isHovered && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

// Compact progress indicator for ItemCard
interface SubtaskProgressProps {
  completed: number;
  total: number;
  className?: string;
}

export const SubtaskProgress = ({ completed, total, className }: SubtaskProgressProps) => {
  if (total === 0) return null;

  const progress = Math.round((completed / total) * 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress value={progress} className="h-1.5 w-16" />
      <span className="text-xs text-muted-foreground">
        {completed}/{total}
      </span>
    </div>
  );
};
