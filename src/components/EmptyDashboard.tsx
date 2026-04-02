import { Plus, Mic, ScanLine, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyDashboardProps {
  onAddItem?: () => void;
  onVoice?: () => void;
  onScan?: () => void;
}

export const EmptyDashboard = ({ onAddItem, onVoice, onScan }: EmptyDashboardProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in-up">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Calendar className="h-10 w-10 text-primary" />
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-2">
        Ziua ta e liberă! ✨
      </h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-[280px] leading-relaxed">
        Nu ai nimic programat. Adaugă primul task, eveniment sau reminder.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[260px]">
        <Button onClick={onAddItem} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Adaugă un item
        </Button>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={onVoice} className="flex-1 gap-2">
            <Mic className="h-4 w-4" />
            Vocal
          </Button>
          <Button variant="outline" onClick={onScan} className="flex-1 gap-2">
            <ScanLine className="h-4 w-4" />
            Scanează
          </Button>
        </div>
      </div>

      <div className="mt-8 p-3 rounded-xl bg-primary/5 border border-primary/10 max-w-[280px]">
        <p className="text-xs text-primary flex items-start gap-2">
          <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Sfat: Explorează meniul "Mai multe" pentru funcții AI precum Smart Scheduler, Templates și Habit Tracker!</span>
        </p>
      </div>
    </div>
  );
};
