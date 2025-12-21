import { CheckCircle2, Calendar, Bell, TrendingUp } from "lucide-react";
import { Item, Task } from "@/types";

interface QuickStatsProps {
  items: Item[];
}

export const QuickStats = ({ items }: QuickStatsProps) => {
  const tasks = items.filter(i => i.type === 'task') as Task[];
  const events = items.filter(i => i.type === 'event');
  const reminders = items.filter(i => i.type === 'reminder');
  
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const stats = [
    {
      icon: CheckCircle2,
      label: 'Taskuri rămase',
      value: pendingTasks,
      color: 'text-task',
      bg: 'bg-task-muted',
    },
    {
      icon: Calendar,
      label: 'Evenimente',
      value: events.length,
      color: 'text-event',
      bg: 'bg-event-muted',
    },
    {
      icon: Bell,
      label: 'Remindere',
      value: reminders.length,
      color: 'text-reminder',
      bg: 'bg-reminder-muted',
    },
    {
      icon: TrendingUp,
      label: 'Completat',
      value: `${completionRate}%`,
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <div 
          key={stat.label}
          className={`${stat.bg} rounded-xl p-4 animate-fade-in-up`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
          <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};
