import { useState, useEffect } from "react";
import { Heart, Battery, Brain, TrendingUp, Smile, Meh, Frown, Zap, ZapOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoodEntry, MoodCorrelation } from "@/hooks/useMoodTracker";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

const ENERGY_ICONS = [ZapOff, Zap, Zap, Zap, Zap];
const ENERGY_LABELS = ["Epuizat", "Scăzut", "Mediu", "Bun", "Excelent"];
const ENERGY_COLORS = [
  "text-red-400",
  "text-orange-400",
  "text-yellow-400",
  "text-green-400",
  "text-emerald-400",
];

const MOOD_ICONS = [Frown, Frown, Meh, Smile, Smile];
const MOOD_LABELS = ["Foarte rău", "Rău", "Neutru", "Bine", "Foarte bine"];
const MOOD_COLORS = [
  "text-red-400",
  "text-orange-400",
  "text-yellow-400",
  "text-green-400",
  "text-emerald-400",
];

interface MoodTrackerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: MoodEntry[];
  todayEntry: MoodEntry | undefined;
  correlationData: MoodCorrelation[];
  averages: { energy: number; mood: number; productivity: number };
  onLogMood: (energy: number, mood: number, note?: string) => Promise<void>;
}

export const MoodTracker = ({
  open,
  onOpenChange,
  entries,
  todayEntry,
  correlationData,
  averages,
  onLogMood,
}: MoodTrackerProps) => {
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (todayEntry) {
      setEnergy(todayEntry.energy_level);
      setMood(todayEntry.mood_level);
      setNote(todayEntry.note || "");
    } else {
      setEnergy(3);
      setMood(3);
      setNote("");
    }
  }, [todayEntry, open]);

  const handleSave = async () => {
    setSaving(true);
    await onLogMood(energy, mood, note || undefined);
    setSaving(false);
  };

  const chartData = correlationData.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd MMM", { locale: ro }),
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Energie & Dispoziție
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Log Today */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-4">
            <h3 className="font-semibold text-sm text-foreground">
              {todayEntry ? "Actualizează ziua de azi" : "Cum te simți azi?"}
            </h3>

            {/* Energy Level */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Battery className="h-3.5 w-3.5" /> Nivel energie
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const Icon = ENERGY_ICONS[level - 1];
                  return (
                    <button
                      key={level}
                      onClick={() => setEnergy(level)}
                      className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        energy === level
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          energy === level ? ENERGY_COLORS[level - 1] : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {ENERGY_LABELS[level - 1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood Level */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Smile className="h-3.5 w-3.5" /> Dispoziție
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const Icon = MOOD_ICONS[level - 1];
                  return (
                    <button
                      key={level}
                      onClick={() => setMood(level)}
                      className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        mood === level
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          mood === level ? MOOD_COLORS[level - 1] : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {MOOD_LABELS[level - 1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <Textarea
              placeholder="Notă opțională despre ziua ta..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none h-16 text-sm"
            />

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Se salvează..." : todayEntry ? "Actualizează" : "Salvează"}
            </Button>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <Battery className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{averages.energy}</p>
              <p className="text-[10px] text-muted-foreground">Energie medie</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <Smile className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{averages.mood}</p>
              <p className="text-[10px] text-muted-foreground">Dispoziție medie</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{averages.productivity}</p>
              <p className="text-[10px] text-muted-foreground">Productivitate</p>
            </div>
          </div>

          {/* Correlation Chart */}
          {chartData.length >= 3 && (
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Corelație pe 30 zile
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 12% 18%)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(220 15% 55%)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(220 15% 55%)" }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(225 15% 11%)",
                        border: "1px solid hsl(225 12% 18%)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                      name="Energie"
                    />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#facc15"
                      strokeWidth={2}
                      dot={false}
                      name="Dispoziție"
                    />
                    <Line
                      type="monotone"
                      dataKey="productivity"
                      stroke="hsl(220 90% 60%)"
                      strokeWidth={2}
                      dot={false}
                      name="Productivitate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Observă cum energia și dispoziția influențează productivitatea ta.
              </p>
            </div>
          )}

          {/* Recent Entries */}
          {entries.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground">Istoric recent</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...entries].reverse().slice(0, 7).map((entry) => {
                  const MoodIcon = MOOD_ICONS[entry.mood_level - 1];
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border"
                    >
                      <MoodIcon
                        className={`h-5 w-5 ${MOOD_COLORS[entry.mood_level - 1]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {format(parseISO(entry.date), "EEEE, d MMMM", { locale: ro })}
                        </p>
                        {entry.note && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {entry.note}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>⚡{entry.energy_level}</span>
                        <span>😊{entry.mood_level}</span>
                        <span>✅{entry.tasks_completed}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
