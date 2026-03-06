import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, differenceInCalendarDays, startOfDay } from 'date-fns';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly';
  targetPerPeriod: number;
  createdAt: Date;
  archived: boolean;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedDate: string; // YYYY-MM-DD
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  completionRate: number; // 0-100
  completions: Set<string>; // set of YYYY-MM-DD dates
}

const dbToHabit = (db: any): Habit => ({
  id: db.id,
  name: db.name,
  icon: db.icon,
  color: db.color,
  frequency: db.frequency,
  targetPerPeriod: db.target_per_period,
  createdAt: new Date(db.created_at),
  archived: db.archived,
});

const calculateStreak = (completions: Set<string>, today: string): { current: number; longest: number } => {
  let current = 0;
  let longest = 0;
  let streak = 0;
  const todayDate = new Date(today);

  // Check if completed today, if so start from today, otherwise from yesterday
  let checkDate = completions.has(today) ? todayDate : subDays(todayDate, 1);

  // Current streak
  while (completions.has(format(checkDate, 'yyyy-MM-dd'))) {
    current++;
    checkDate = subDays(checkDate, 1);
  }

  // Longest streak - check last 365 days
  for (let i = 0; i < 365; i++) {
    const dateStr = format(subDays(todayDate, i), 'yyyy-MM-dd');
    if (completions.has(dateStr)) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 0;
    }
  }

  return { current, longest };
};

export const useHabits = (userId: string | undefined) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) { setHabits([]); setCompletions([]); setLoading(false); return; }

    const [habitsRes, completionsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).eq('archived', false).order('created_at'),
      supabase.from('habit_completions').select('*').eq('user_id', userId)
        .gte('completed_date', format(subDays(new Date(), 365), 'yyyy-MM-dd')),
    ]);

    if (habitsRes.data) setHabits(habitsRes.data.map(dbToHabit));
    if (completionsRes.data) {
      setCompletions(completionsRes.data.map((c: any) => ({
        id: c.id,
        habitId: c.habit_id,
        completedDate: c.completed_date,
      })));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const habitsWithStats: HabitWithStats[] = useMemo(() => {
    return habits.map(habit => {
      const habitCompletions = completions.filter(c => c.habitId === habit.id);
      const completionDates = new Set(habitCompletions.map(c => c.completedDate));
      const { current, longest } = calculateStreak(completionDates, today);

      // Completion rate: last 30 days
      let completedDays = 0;
      const daysToCheck = Math.min(30, differenceInCalendarDays(new Date(), habit.createdAt) + 1);
      for (let i = 0; i < daysToCheck; i++) {
        if (completionDates.has(format(subDays(new Date(), i), 'yyyy-MM-dd'))) {
          completedDays++;
        }
      }

      return {
        ...habit,
        currentStreak: current,
        longestStreak: longest,
        completedToday: completionDates.has(today),
        completionRate: daysToCheck > 0 ? Math.round((completedDays / daysToCheck) * 100) : 0,
        completions: completionDates,
      };
    });
  }, [habits, completions, today]);

  const createHabit = async (data: Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'targetPerPeriod'>): Promise<Habit | null> => {
    if (!userId) return null;
    const { data: row, error } = await supabase.from('habits').insert({
      user_id: userId,
      name: data.name,
      icon: data.icon,
      color: data.color,
      frequency: data.frequency,
      target_per_period: data.targetPerPeriod,
    } as any).select().single();

    if (error || !row) return null;
    const habit = dbToHabit(row);
    setHabits(prev => [...prev, habit]);
    return habit;
  };

  const toggleCompletion = async (habitId: string, date: string = today) => {
    if (!userId) return;
    const existing = completions.find(c => c.habitId === habitId && c.completedDate === date);

    if (existing) {
      await supabase.from('habit_completions').delete().eq('id', existing.id);
      setCompletions(prev => prev.filter(c => c.id !== existing.id));
    } else {
      const { data, error } = await supabase.from('habit_completions').insert({
        habit_id: habitId,
        user_id: userId,
        completed_date: date,
      } as any).select().single();

      if (!error && data) {
        setCompletions(prev => [...prev, {
          id: (data as any).id,
          habitId: (data as any).habit_id,
          completedDate: (data as any).completed_date,
        }]);
      }
    }
  };

  const deleteHabit = async (id: string): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase.from('habits').delete().eq('id', id).eq('user_id', userId);
    if (error) return false;
    setHabits(prev => prev.filter(h => h.id !== id));
    setCompletions(prev => prev.filter(c => c.habitId !== id));
    return true;
  };

  const updateHabit = async (habit: Habit): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase.from('habits').update({
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      frequency: habit.frequency,
      target_per_period: habit.targetPerPeriod,
    } as any).eq('id', habit.id).eq('user_id', userId);
    if (error) return false;
    setHabits(prev => prev.map(h => h.id === habit.id ? habit : h));
    return true;
  };

  return {
    habits: habitsWithStats,
    loading,
    createHabit,
    toggleCompletion,
    deleteHabit,
    updateHabit,
    refetch: fetchData,
  };
};
