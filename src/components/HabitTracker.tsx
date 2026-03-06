import { useState } from "react";
import {
  Flame, Plus, Trash2, Check, TrendingUp, Calendar, Trophy, Pencil,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ro } from "date-fns/locale";
import { HabitWithStats } from "@/hooks/useHabits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const HABIT_ICONS = ['✅', '💪', '📚', '🧘', '🏃', '💧', '🍎', '😴', '✍️', '🎯', '🧠', '💊'];
const HABIT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

interface HabitTrackerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: HabitWithStats[];
  onCreateHabit: (data: { name: string; icon: string; color: string; frequency: 'daily' | 'weekly'; targetPerPeriod: number }) => Promise<any>;
  onToggleCompletion: (habitId: string, date?: string) => Promise<void>;
  onDeleteHabit: (id: string) => Promise<boolean>;
}

const StreakGrid = ({ habit }: { habit: HabitWithStats }) => {
  const days = 28; // 4 weeks
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: days }).map((_, i) => {
        const date = subDays(today, days - 1 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const completed = habit.completions.has(dateStr);
        const isToday = i === days - 1;

        return (
          <div
            key={dateStr}
            title={format(date, 'd MMM', { locale: ro })}
            className={`w-5 h-5 rounded-sm transition-all ${
              completed
                ? 'opacity-100'
                : 'bg-muted/30'
            } ${isToday ? 'ring-1 ring-primary/50' : ''}`}
            style={completed ? { backgroundColor: habit.color } : undefined}
          />
        );
      })}
    </div>
  );
};

export const HabitTracker = ({
  open,
  onOpenChange,
  habits,
  onCreateHabit,
  onToggleCompletion,
  onDeleteHabit,
}: HabitTrackerProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✅');
  const [color, setColor] = useState('#6366f1');

  const resetForm = () => { setName(''); setIcon('✅'); setColor('#6366f1'); };

  const handleSave = async () => {
    if (!name.trim()) return;
    await onCreateHabit({ name: name.trim(), icon, color, frequency: 'daily', targetPerPeriod: 1 });
    resetForm();
    setAddDialogOpen(false);
  };

  const totalStreaks = habits.reduce((sum, h) => sum + h.currentStreak, 0);
  const completedToday = habits.filter(h => h.completedToday).length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-card border-border">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Habit Tracker
            </SheetTitle>
            <SheetDescription>
              Construiește obiceiuri sănătoase și urmărește streak-urile
            </SheetDescription>
          </SheetHeader>

          {/* Summary Stats */}
          {habits.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-lg font-bold text-foreground">{completedToday}/{habits.length}</p>
                <p className="text-[10px] text-muted-foreground">Azi</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-lg font-bold text-foreground">{totalStreaks}</p>
                <p className="text-[10px] text-muted-foreground">Streak total</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  {habits.length > 0 ? Math.max(...habits.map(h => h.longestStreak)) : 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Record</p>
              </div>
            </div>
          )}

          {/* Habit list */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(85vh-320px)] pb-4">
            {habits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Flame className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Niciun obicei adăugat</p>
                <p className="text-sm mt-1">Creează un obicei pentru a-ți urmări progresul zilnic</p>
              </div>
            ) : (
              habits.map((habit) => (
                <div
                  key={habit.id}
                  className="p-4 rounded-xl bg-muted/20 border border-border space-y-3"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleCompletion(habit.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all shrink-0 ${
                        habit.completedToday
                          ? 'ring-2 scale-110'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                      style={habit.completedToday ? {
                        backgroundColor: habit.color + '33',
                        borderColor: habit.color,
                        ringColor: habit.color,
                      } : undefined}
                    >
                      {habit.completedToday ? <Check className="h-5 w-5" style={{ color: habit.color }} /> : habit.icon}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${habit.completedToday ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {habit.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {habit.currentStreak > 0 && (
                          <span className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            {habit.currentStreak} zile
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {habit.completionRate}%
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => onDeleteHabit(habit.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Completion rate bar */}
                  <Progress value={habit.completionRate} className="h-1.5" />

                  {/* Streak Grid (last 28 days) */}
                  <StreakGrid habit={habit} />
                </div>
              ))
            )}
          </div>

          <div className="pt-2">
            <Button className="w-full gap-2" onClick={() => { resetForm(); setAddDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Adaugă obicei
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Habit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(v) => { setAddDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Obicei nou</DialogTitle>
            <DialogDescription>Creează un obicei zilnic pe care vrei să-l urmărești</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon selector */}
            <div className="space-y-2">
              <Label>Pictogramă</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all
                      ${icon === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted/50 hover:bg-muted'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color selector */}
            <div className="space-y-2">
              <Label>Culoare</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="habit-name">Nume</Label>
              <Input
                id="habit-name"
                placeholder="Ex: Meditație, Citit, Sport"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Adaugă obiceiul
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
