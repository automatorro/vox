import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Check, X, AlertTriangle, Lightbulb, Calendar, Clock, Flag, Tag, Edit3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item, Task, Event, Reminder, VoiceParseResult, Priority } from "@/types";
import { Category } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

interface VoiceConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parseResult: VoiceParseResult | null;
  categories: Category[];
  onConfirm: (item: Item) => void;
  onCancel: () => void;
}

const priorityConfig = {
  low: { label: "Scăzută", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medie", color: "bg-blue-500/20 text-blue-400" },
  high: { label: "Mare", color: "bg-orange-500/20 text-orange-400" },
  critical: { label: "Urgentă", color: "bg-destructive/20 text-destructive" },
};

const typeLabels = {
  task: { label: "Task", icon: "📋" },
  event: { label: "Eveniment", icon: "📅" },
  reminder: { label: "Reminder", icon: "🔔" },
};

export const VoiceConfirmationModal = ({
  open,
  onOpenChange,
  parseResult,
  categories,
  onConfirm,
  onCancel,
}: VoiceConfirmationModalProps) => {
  const [editedItem, setEditedItem] = useState<VoiceParseResult["item"] | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (parseResult?.item) {
      setEditedItem({ ...parseResult.item });
      setIsEditing(false);
    }
  }, [parseResult]);

  if (!parseResult || !editedItem) return null;

  const handleConfirm = () => {
    const now = new Date();
    const id = `voice-${Date.now()}`;

    let newItem: Item;

    if (editedItem.type === "task") {
      newItem = {
        id,
        type: "task",
        title: editedItem.title,
        deadline: new Date(editedItem.deadline || now),
        priority: editedItem.priority || "medium",
        completed: false,
        categoryId: editedItem.categoryId || undefined,
        createdAt: now,
      } as Task;
    } else if (editedItem.type === "event") {
      newItem = {
        id,
        type: "event",
        title: editedItem.title,
        startTime: new Date(editedItem.startTime || now),
        duration: editedItem.duration || 60,
        synced: false,
        createdAt: now,
      } as Event;
    } else {
      newItem = {
        id,
        type: "reminder",
        title: editedItem.title,
        time: new Date(editedItem.time || now),
        notified: false,
        createdAt: now,
      } as Reminder;
    }

    onConfirm(newItem);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const getDateDisplay = () => {
    if (editedItem.type === "task" && editedItem.deadline) {
      return format(new Date(editedItem.deadline), "EEEE, d MMMM yyyy", { locale: ro });
    }
    if (editedItem.type === "event" && editedItem.startTime) {
      return format(new Date(editedItem.startTime), "EEEE, d MMMM yyyy 'la' HH:mm", { locale: ro });
    }
    if (editedItem.type === "reminder" && editedItem.time) {
      return format(new Date(editedItem.time), "EEEE, d MMMM yyyy 'la' HH:mm", { locale: ro });
    }
    return "Azi";
  };

  const selectedCategory = categories.find(c => c.id === editedItem.categoryId);
  const confidencePercent = Math.round((parseResult.confidence || 0.9) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{typeLabels[editedItem.type].icon}</span>
            <span>Confirmare {typeLabels[editedItem.type].label}</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {confidencePercent}% încredere
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Am înțeles: "{parseResult.transcript}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview Card */}
          <div className="rounded-lg border bg-card/50 p-4 space-y-3">
            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Edit3 className="h-3 w-3" /> Titlu
              </Label>
              {isEditing ? (
                <Input
                  value={editedItem.title}
                  onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                  className="text-lg font-medium"
                />
              ) : (
                <p className="text-lg font-medium">{editedItem.title}</p>
              )}
            </div>

            {/* Date/Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{getDateDisplay()}</span>
            </div>

            {/* Duration (for events) */}
            {editedItem.type === "event" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedItem.duration || 60}
                    onChange={(e) => setEditedItem({ ...editedItem, duration: parseInt(e.target.value) })}
                    className="w-20 h-8"
                  />
                ) : (
                  <span>{editedItem.duration || 60} minute</span>
                )}
              </div>
            )}

            {/* Priority (for tasks) */}
            {editedItem.type === "task" && (
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Select
                    value={editedItem.priority || "medium"}
                    onValueChange={(value: Priority) => setEditedItem({ ...editedItem, priority: value })}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={cn("text-xs", priorityConfig[editedItem.priority || "medium"].color)}>
                    {priorityConfig[editedItem.priority || "medium"].label}
                  </Badge>
                )}
              </div>
            )}

            {/* Category (for tasks) */}
            {editedItem.type === "task" && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Select
                    value={editedItem.categoryId || "none"}
                    onValueChange={(value) => setEditedItem({ ...editedItem, categoryId: value === "none" ? undefined : value })}
                  >
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Fără categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fără categorie</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : selectedCategory ? (
                  <Badge
                    className="text-xs"
                    style={{
                      backgroundColor: `${selectedCategory.color}20`,
                      color: selectedCategory.color,
                    }}
                  >
                    {selectedCategory.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Fără categorie</span>
                )}
              </div>
            )}
          </div>

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="space-y-2">
              {parseResult.warnings.map((warning, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-2 rounded-md p-3 text-sm",
                    warning.severity === "error" && "bg-destructive/10 text-destructive",
                    warning.severity === "warning" && "bg-orange-500/10 text-orange-400",
                    warning.severity === "info" && "bg-blue-500/10 text-blue-400"
                  )}
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {parseResult.suggestions.length > 0 && (
            <div className="space-y-2">
              {parseResult.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-md p-3 text-sm bg-primary/10 text-primary"
                >
                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{suggestion.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 className="h-4 w-4 mr-1" />
            {isEditing ? "Gata" : "Editează"}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Anulează
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="h-4 w-4 mr-1" />
            Confirmă
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
