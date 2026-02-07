import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { PomodoroPhase } from "./usePomodoroTimer";

export interface FocusSession {
  id: string;
  user_id: string;
  item_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  phase: PomodoroPhase;
  completed: boolean;
  created_at: string;
}

export interface ProductivityDailyStats {
  id: string;
  user_id: string;
  date: string;
  focus_minutes: number;
  tasks_completed: number;
  sessions_count: number;
  most_productive_hour: number | null;
  streak_days: number;
}

interface CreateSessionInput {
  item_id?: string | null;
  phase: PomodoroPhase;
}

interface UpdateSessionInput {
  id: string;
  ended_at?: string;
  duration_seconds?: number;
  completed?: boolean;
}

export const useFocusSessions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Fetch today's sessions
  const { data: todaySessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['focus-sessions', 'today', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', today.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as FocusSession[];
    },
    enabled: !!user?.id,
  });

  // Fetch sessions for a specific date range
  const useSessionsInRange = (startDate: Date, endDate: Date) => {
    return useQuery({
      queryKey: ['focus-sessions', 'range', user?.id, startDate.toISOString(), endDate.toISOString()],
      queryFn: async () => {
        if (!user?.id) return [];
        
        const { data, error } = await supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('started_at', startDate.toISOString())
          .lte('started_at', endDate.toISOString())
          .order('started_at', { ascending: true });

        if (error) throw error;
        return data as FocusSession[];
      },
      enabled: !!user?.id,
    });
  };

  // Fetch productivity stats for last N days
  const { data: productivityStats = [], isLoading: isLoadingStats } = useQuery({
    queryKey: ['productivity-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('productivity_daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data as ProductivityDailyStats[];
    },
    enabled: !!user?.id,
  });

  // Create a new session
  const createSessionMutation = useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('focus_sessions')
        .insert({
          user_id: user.id,
          item_id: input.item_id || null,
          phase: input.phase,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as FocusSession;
    },
    onSuccess: (data) => {
      setActiveSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] });
    },
  });

  // Update a session
  const updateSessionMutation = useMutation({
    mutationFn: async (input: UpdateSessionInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('focus_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FocusSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] });
    },
  });

  // Complete a session (helper function)
  const completeSession = useCallback(async (sessionId: string, durationSeconds: number) => {
    return updateSessionMutation.mutateAsync({
      id: sessionId,
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      completed: true,
    });
  }, [updateSessionMutation]);

  // Update or create daily stats
  const updateDailyStatsMutation = useMutation({
    mutationFn: async (updates: { 
      focusMinutesToAdd?: number; 
      tasksCompletedToAdd?: number;
      sessionsToAdd?: number;
      currentHour?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // First, try to get existing stats for today
      const { data: existing } = await supabase
        .from('productivity_daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existing) {
        // Update existing record
        const newFocusMinutes = (existing.focus_minutes || 0) + (updates.focusMinutesToAdd || 0);
        const newTasksCompleted = (existing.tasks_completed || 0) + (updates.tasksCompletedToAdd || 0);
        const newSessionsCount = (existing.sessions_count || 0) + (updates.sessionsToAdd || 0);

        const { data, error } = await supabase
          .from('productivity_daily_stats')
          .update({
            focus_minutes: newFocusMinutes,
            tasks_completed: newTasksCompleted,
            sessions_count: newSessionsCount,
            most_productive_hour: updates.currentHour ?? existing.most_productive_hour,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Calculate streak from previous days
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: yesterdayStats } = await supabase
          .from('productivity_daily_stats')
          .select('streak_days')
          .eq('user_id', user.id)
          .eq('date', yesterday.toISOString().split('T')[0])
          .single();

        const newStreak = yesterdayStats ? (yesterdayStats.streak_days || 0) + 1 : 1;

        // Create new record
        const { data, error } = await supabase
          .from('productivity_daily_stats')
          .insert({
            user_id: user.id,
            date: today,
            focus_minutes: updates.focusMinutesToAdd || 0,
            tasks_completed: updates.tasksCompletedToAdd || 0,
            sessions_count: updates.sessionsToAdd || 0,
            most_productive_hour: updates.currentHour || null,
            streak_days: newStreak,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-stats'] });
    },
  });

  // Get sessions for a specific item
  const getSessionsForItem = useCallback(async (itemId: string) => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .eq('completed', true)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data as FocusSession[];
  }, [user?.id]);

  // Calculate today's total focus time
  const todayFocusMinutes = todaySessions
    .filter(s => s.phase === 'work' && s.completed)
    .reduce((sum, s) => sum + Math.floor(s.duration_seconds / 60), 0);

  const todayCompletedSessions = todaySessions
    .filter(s => s.phase === 'work' && s.completed).length;

  // Get current streak from latest stats
  const currentStreak = productivityStats.length > 0 
    ? productivityStats[productivityStats.length - 1]?.streak_days || 0
    : 0;

  return {
    // Data
    todaySessions,
    productivityStats,
    activeSessionId,
    todayFocusMinutes,
    todayCompletedSessions,
    currentStreak,
    
    // Loading states
    isLoadingSessions,
    isLoadingStats,
    
    // Actions
    createSession: createSessionMutation.mutateAsync,
    updateSession: updateSessionMutation.mutateAsync,
    completeSession,
    updateDailyStats: updateDailyStatsMutation.mutateAsync,
    getSessionsForItem,
    setActiveSessionId,
    useSessionsInRange,
    
    // Mutation states
    isCreating: createSessionMutation.isPending,
    isUpdating: updateSessionMutation.isPending,
  };
};
