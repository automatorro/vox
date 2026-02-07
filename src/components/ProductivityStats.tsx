import { useMemo } from "react";
import { format, subDays, startOfWeek, eachDayOfInterval } from "date-fns";
import { ro } from "date-fns/locale";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart
} from "recharts";
import { Flame, Clock, Target, TrendingUp, Calendar, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFocusSessions, ProductivityDailyStats } from "@/hooks/useFocusSessions";
import { cn } from "@/lib/utils";

interface ProductivityStatsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductivityStats = ({ open, onOpenChange }: ProductivityStatsProps) => {
  const { 
    productivityStats, 
    todayFocusMinutes, 
    todayCompletedSessions,
    currentStreak,
    isLoadingStats 
  } = useFocusSessions();

  // Prepare chart data for last 7 days
  const weeklyData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return last7Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const stats = productivityStats.find(s => s.date === dateStr);
      
      return {
        date: format(day, 'EEE', { locale: ro }),
        fullDate: format(day, 'd MMM', { locale: ro }),
        focusMinutes: stats?.focus_minutes || 0,
        sessionsCount: stats?.sessions_count || 0,
        tasksCompleted: stats?.tasks_completed || 0,
      };
    });
  }, [productivityStats]);

  // Calculate weekly totals
  const weeklyTotals = useMemo(() => {
    return weeklyData.reduce((acc, day) => ({
      focusMinutes: acc.focusMinutes + day.focusMinutes,
      sessions: acc.sessions + day.sessionsCount,
      tasks: acc.tasks + day.tasksCompleted,
    }), { focusMinutes: 0, sessions: 0, tasks: 0 });
  }, [weeklyData]);

  // Find most productive hour
  const mostProductiveHour = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    productivityStats.forEach(stat => {
      if (stat.most_productive_hour !== null) {
        hourCounts[stat.most_productive_hour] = (hourCounts[stat.most_productive_hour] || 0) + 1;
      }
    });
    
    let maxHour = null;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxHour = parseInt(hour);
      }
    });
    
    return maxHour !== null ? `${maxHour}:00 - ${maxHour + 1}:00` : 'N/A';
  }, [productivityStats]);

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return last30Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const stats = productivityStats.find(s => s.date === dateStr);
      
      return {
        date: format(day, 'd'),
        focusMinutes: stats?.focus_minutes || 0,
      };
    });
  }, [productivityStats]);

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue,
    color = 'primary'
  }: { 
    icon: typeof Flame; 
    label: string; 
    value: string | number; 
    subValue?: string;
    color?: 'primary' | 'task' | 'event' | 'reminder';
  }) => (
    <div className={cn(
      "flex flex-col items-center p-4 rounded-xl border",
      color === 'primary' && "bg-primary/10 border-primary/20",
      color === 'task' && "bg-task/10 border-task/20",
      color === 'event' && "bg-event/10 border-event/20",
      color === 'reminder' && "bg-reminder/10 border-reminder/20",
    )}>
      <Icon className={cn(
        "h-5 w-5 mb-2",
        color === 'primary' && "text-primary",
        color === 'task' && "text-task",
        color === 'event' && "text-event",
        color === 'reminder' && "text-reminder",
      )} />
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {subValue && (
        <span className="text-xs text-muted-foreground mt-1">{subValue}</span>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Statistici Productivitate
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Today's Stats */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Astăzi</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={Clock}
                label="Timp focus"
                value={formatMinutes(todayFocusMinutes)}
                color="primary"
              />
              <StatCard
                icon={Target}
                label="Sesiuni"
                value={todayCompletedSessions}
                color="task"
              />
              <StatCard
                icon={Flame}
                label="Streak"
                value={`${currentStreak} zile`}
                color="event"
              />
            </div>
          </div>

          <Tabs defaultValue="weekly" className="px-6 py-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="weekly">Săptămâna</TabsTrigger>
              <TabsTrigger value="monthly">Luna</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="space-y-6">
              {/* Weekly Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{formatMinutes(weeklyTotals.focusMinutes)}</div>
                  <div className="text-xs text-muted-foreground">Total focus</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{weeklyTotals.sessions}</div>
                  <div className="text-xs text-muted-foreground">Sesiuni</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{weeklyTotals.tasks}</div>
                  <div className="text-xs text-muted-foreground">Task-uri</div>
                </div>
              </div>

              {/* Weekly Bar Chart */}
              <div>
                <h4 className="text-sm font-medium mb-3">Timp focus pe zi</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        className="fill-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="fill-muted-foreground"
                        tickFormatter={(val) => `${val}m`}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="font-medium">{payload[0].payload.fullDate}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatMinutes(payload[0].value as number)} focus
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="focusMinutes" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Most Productive Hour */}
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                <Zap className="h-8 w-8 text-event" />
                <div>
                  <div className="text-sm text-muted-foreground">Ora ta cea mai productivă</div>
                  <div className="text-lg font-semibold">{mostProductiveHour}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6">
              {/* Monthly Trend */}
              <div>
                <h4 className="text-sm font-medium mb-3">Tendință ultimele 30 zile</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        interval={4}
                        className="fill-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="fill-muted-foreground"
                        tickFormatter={(val) => `${val}m`}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="text-sm text-muted-foreground">
                                  {formatMinutes(payload[0].value as number)} focus
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <defs>
                        <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="focusMinutes" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#colorFocus)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Stats Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Zile active</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {productivityStats.filter(s => s.focus_minutes > 0).length}
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Media zilnică</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatMinutes(
                      productivityStats.length > 0
                        ? Math.round(productivityStats.reduce((a, b) => a + b.focus_minutes, 0) / productivityStats.length)
                        : 0
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
