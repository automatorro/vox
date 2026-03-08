import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export interface MoodEntry {
  id: string;
  date: string;
  energy_level: number;
  mood_level: number;
  note: string | null;
  tasks_completed: number;
  focus_minutes: number;
}

export interface MoodCorrelation {
  date: string;
  energy: number;
  mood: number;
  productivity: number; // tasks_completed + focus_minutes/30
}

export const useMoodTracker = (userId?: string) => {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true });

    if (!error && data) {
      setEntries(data as MoodEntry[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const getTodayEntry = useCallback((): MoodEntry | undefined => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return entries.find(e => e.date === today);
  }, [entries]);

  const logMood = useCallback(async (
    energyLevel: number,
    moodLevel: number,
    note?: string,
  ) => {
    if (!userId) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch today's productivity stats
    const { data: stats } = await supabase
      .from('productivity_daily_stats')
      .select('tasks_completed, focus_minutes')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    const entry = {
      user_id: userId,
      date: today,
      energy_level: energyLevel,
      mood_level: moodLevel,
      note: note || null,
      tasks_completed: stats?.tasks_completed ?? 0,
      focus_minutes: stats?.focus_minutes ?? 0,
    };

    const { data, error } = await supabase
      .from('mood_entries')
      .upsert(entry, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) {
      toast({ title: 'Eroare', description: 'Nu s-a putut salva.', variant: 'destructive' });
      return;
    }

    if (data) {
      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== today);
        return [...filtered, data as MoodEntry].sort((a, b) => a.date.localeCompare(b.date));
      });
    }

    toast({ title: '✅ Salvat', description: 'Dispoziția ta a fost înregistrată.' });
  }, [userId, toast]);

  const getCorrelationData = useCallback((): MoodCorrelation[] => {
    return entries.map(e => ({
      date: e.date,
      energy: e.energy_level,
      mood: e.mood_level,
      productivity: e.tasks_completed + Math.round(e.focus_minutes / 30),
    }));
  }, [entries]);

  const getAverages = useCallback(() => {
    if (entries.length === 0) return { energy: 0, mood: 0, productivity: 0 };
    const sum = entries.reduce(
      (acc, e) => ({
        energy: acc.energy + e.energy_level,
        mood: acc.mood + e.mood_level,
        productivity: acc.productivity + e.tasks_completed + Math.round(e.focus_minutes / 30),
      }),
      { energy: 0, mood: 0, productivity: 0 },
    );
    return {
      energy: +(sum.energy / entries.length).toFixed(1),
      mood: +(sum.mood / entries.length).toFixed(1),
      productivity: +(sum.productivity / entries.length).toFixed(1),
    };
  }, [entries]);

  return {
    entries,
    loading,
    getTodayEntry,
    logMood,
    getCorrelationData,
    getAverages,
  };
};
