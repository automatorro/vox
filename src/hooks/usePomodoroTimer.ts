import { useState, useEffect, useCallback, useRef } from "react";

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak' | 'idle';

interface PomodoroSettings {
  workDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
};

interface UsePomodoroTimerReturn {
  timeRemaining: number; // seconds
  phase: PomodoroPhase;
  isRunning: boolean;
  completedSessions: number;
  totalTimeWorked: number; // seconds for current task
  settings: PomodoroSettings;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
}

export const usePomodoroTimer = (): UsePomodoroTimerReturn => {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60);
  const [phase, setPhase] = useState<PomodoroPhase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalTimeWorked, setTotalTimeWorked] = useState(0);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play notification sound
  const playNotificationSound = useCallback((type: 'workEnd' | 'breakEnd') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      const playTone = (freq: number, startTime: number, duration: number, volume: number = 0.3) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, startTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (type === 'workEnd') {
        // Celebratory ascending melody
        playTone(523.25, ctx.currentTime, 0.2); // C5
        playTone(659.25, ctx.currentTime + 0.15, 0.2); // E5
        playTone(783.99, ctx.currentTime + 0.3, 0.3); // G5
      } else {
        // Gentle reminder to get back to work
        playTone(440, ctx.currentTime, 0.15); // A4
        playTone(523.25, ctx.currentTime + 0.1, 0.2); // C5
      }
    } catch (error) {
      console.warn("Audio not supported:", error);
    }
  }, []);

  // Handle phase transitions
  const transitionToNextPhase = useCallback(() => {
    if (phase === 'work') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      playNotificationSound('workEnd');
      
      // Determine next break type
      if (newCompletedSessions % settings.sessionsBeforeLongBreak === 0) {
        setPhase('longBreak');
        setTimeRemaining(settings.longBreakDuration * 60);
      } else {
        setPhase('shortBreak');
        setTimeRemaining(settings.shortBreakDuration * 60);
      }
      // Auto-start break
      setIsRunning(true);
    } else if (phase === 'shortBreak' || phase === 'longBreak') {
      playNotificationSound('breakEnd');
      setPhase('work');
      setTimeRemaining(settings.workDuration * 60);
      // Auto-start work
      setIsRunning(true);
    }
  }, [phase, completedSessions, settings, playNotificationSound]);

  // Timer tick
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            transitionToNextPhase();
            return 0;
          }
          return prev - 1;
        });
        
        // Track work time
        if (phase === 'work') {
          setTotalTimeWorked(prev => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, phase, transitionToNextPhase]);

  const start = useCallback(() => {
    if (phase === 'idle') {
      setPhase('work');
      setTimeRemaining(settings.workDuration * 60);
    }
    setIsRunning(true);
  }, [phase, settings.workDuration]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setPhase('idle');
    setTimeRemaining(settings.workDuration * 60);
    setCompletedSessions(0);
    setTotalTimeWorked(0);
  }, [settings.workDuration]);

  const skip = useCallback(() => {
    transitionToNextPhase();
  }, [transitionToNextPhase]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      // Update time remaining if idle or if changing current phase duration
      if (phase === 'idle' || phase === 'work') {
        if (newSettings.workDuration !== undefined) {
          setTimeRemaining(updated.workDuration * 60);
        }
      }
      return updated;
    });
  }, [phase]);

  return {
    timeRemaining,
    phase,
    isRunning,
    completedSessions,
    totalTimeWorked,
    settings,
    start,
    pause,
    reset,
    skip,
    updateSettings,
  };
};
