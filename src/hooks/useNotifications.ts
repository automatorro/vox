import { useState, useEffect, useCallback } from 'react';
import { Item, Task, Event } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, differenceInHours, startOfDay } from 'date-fns';
import { ro } from 'date-fns/locale';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  email: string;
}

export interface ConflictPair {
  event1: Event;
  event2: Event;
  overlapMinutes: number;
}

export interface OverloadedDay {
  date: string;
  count: number;
  items: Item[];
}

const OVERLOAD_THRESHOLD = 5; // Max items per day before warning
const DEADLINE_WARNING_HOURS = 24; // Warn 24h before deadline

export const useNotifications = (
  items: Item[], 
  settings: NotificationSettings,
  onConflictsDetected?: (conflicts: ConflictPair[]) => void,
  onOverloadDetected?: (overloadedDays: OverloadedDay[]) => void
) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [detectedConflicts, setDetectedConflicts] = useState<ConflictPair[]>([]);
  const [detectedOverloads, setDetectedOverloads] = useState<OverloadedDay[]>([]);

  // Request push notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  // Check permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Send push notification
  const sendPushNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permission !== 'granted') return;

    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: `vox-${Date.now()}`,
    });
  }, [permission]);

  // Send email notification
  const sendEmailNotification = useCallback(async (
    type: 'deadline' | 'overload' | 'conflict',
    notificationItems: Array<{ title: string; deadline?: string; priority?: string }>
  ) => {
    if (!settings.emailEnabled || !settings.email) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          email: settings.email,
          type,
          items: notificationItems,
        },
      });

      if (error) {
        console.error('Failed to send email notification:', error);
        return;
      }

      console.log('Email notification sent:', data);
    } catch (err) {
      console.error('Error sending email notification:', err);
    }
  }, [settings.emailEnabled, settings.email]);

  // Check for approaching deadlines
  const checkDeadlines = useCallback(() => {
    const now = new Date();
    const upcomingDeadlines: Array<{ title: string; deadline: string; priority: string }> = [];

    items.forEach((item) => {
      if (item.type !== 'task') return;
      const task = item as Task;
      if (task.completed) return;

      const hoursUntilDeadline = differenceInHours(task.deadline, now);

      if (hoursUntilDeadline > 0 && hoursUntilDeadline <= DEADLINE_WARNING_HOURS) {
        const deadlineText = isToday(task.deadline)
          ? 'Astăzi'
          : isTomorrow(task.deadline)
          ? 'Mâine'
          : format(task.deadline, 'd MMMM', { locale: ro });

        upcomingDeadlines.push({
          title: task.title,
          deadline: deadlineText,
          priority: task.priority,
        });
      }
    });

    if (upcomingDeadlines.length > 0) {
      // Push notification
      if (settings.pushEnabled) {
        sendPushNotification(
          '⏰ Deadline-uri apropiate!',
          `Ai ${upcomingDeadlines.length} sarcin${upcomingDeadlines.length === 1 ? 'ă' : 'i'} cu deadline în curând.`
        );
      }

      // Email notification
      sendEmailNotification('deadline', upcomingDeadlines);

      // Toast notification
      toast({
        title: '⏰ Deadline-uri apropiate',
        description: `${upcomingDeadlines.length} sarcin${upcomingDeadlines.length === 1 ? 'ă are' : 'i au'} deadline în următoarele 24h`,
        variant: 'destructive',
      });
    }

    return upcomingDeadlines;
  }, [items, settings.pushEnabled, sendPushNotification, sendEmailNotification]);

  // Check for overloaded days
  const checkOverload = useCallback((): OverloadedDay[] => {
    const dayMap = new Map<string, Item[]>();

    items.forEach((item) => {
      let itemDate: Date;
      
      if (item.type === 'task') {
        itemDate = (item as Task).deadline;
      } else if (item.type === 'event') {
        itemDate = (item as Event).startTime;
      } else {
        itemDate = (item as any).time;
      }

      const dayKey = format(startOfDay(itemDate), 'yyyy-MM-dd');
      
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey)!.push(item);
    });

    const overloadedDays: OverloadedDay[] = [];

    dayMap.forEach((dayItems, dateKey) => {
      if (dayItems.length >= OVERLOAD_THRESHOLD) {
        overloadedDays.push({
          date: dateKey,
          count: dayItems.length,
          items: dayItems,
        });
      }
    });

    // Update state
    setDetectedOverloads(overloadedDays);

    if (overloadedDays.length > 0) {
      const overloadItems = overloadedDays[0].items.map((item) => ({
        title: item.title,
      }));

      // Push notification
      if (settings.pushEnabled) {
        sendPushNotification(
          '⚠️ Zi supraîncărcată!',
          `Ai ${overloadedDays[0].count} itemi într-o singură zi. Consideră reprogramarea.`
        );
      }

      // Email notification
      sendEmailNotification('overload', overloadItems);

      // Toast notification with callback trigger
      if (onOverloadDetected) {
        toast({
          title: '⚠️ Supraîncărcare detectată',
          description: `${overloadedDays.length} zi${overloadedDays.length > 1 ? 'le' : ''} cu prea mulți itemi`,
          duration: 10000,
        });
        onOverloadDetected(overloadedDays);
      } else {
        toast({
          title: '⚠️ Supraîncărcare detectată',
          description: `Ai ${overloadedDays[0].count} itemi pentru ${format(new Date(overloadedDays[0].date), 'd MMMM', { locale: ro })}`,
        });
      }
    }

    return overloadedDays;
  }, [items, settings.pushEnabled, sendPushNotification, sendEmailNotification, onOverloadDetected]);

  // Check for conflicts (overlapping events) - returns detailed conflict pairs
  const checkConflicts = useCallback(() => {
    const events = items.filter((item) => item.type === 'event') as Event[];
    const conflictPairs: ConflictPair[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const start1 = new Date(event1.startTime);
        const end1 = new Date(start1.getTime() + event1.duration * 60000);
        const start2 = new Date(event2.startTime);
        const end2 = new Date(start2.getTime() + event2.duration * 60000);

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          // Calculate overlap duration
          const overlapStart = start1 > start2 ? start1 : start2;
          const overlapEnd = end1 < end2 ? end1 : end2;
          const overlapMinutes = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);

          conflictPairs.push({
            event1,
            event2,
            overlapMinutes,
          });
        }
      }
    }

    // Update state
    setDetectedConflicts(conflictPairs);

    if (conflictPairs.length > 0) {
      const uniqueEventTitles = new Set<string>();
      conflictPairs.forEach((pair) => {
        uniqueEventTitles.add(pair.event1.title);
        uniqueEventTitles.add(pair.event2.title);
      });

      // Push notification
      if (settings.pushEnabled) {
        sendPushNotification(
          '🔴 Conflict de programare!',
          `${conflictPairs.length} conflict${conflictPairs.length === 1 ? '' : 'e'} detectat${conflictPairs.length === 1 ? '' : 'e'}.`
        );
      }

      // Email notification
      sendEmailNotification('conflict', Array.from(uniqueEventTitles).map(title => ({ title })));

      // Toast notification with action button
      if (onConflictsDetected) {
        toast({
          title: '🔴 Conflicte detectate',
          description: `${conflictPairs.length} eveniment${conflictPairs.length === 1 ? '' : 'e'} se suprapun${conflictPairs.length === 1 ? 'e' : ''}`,
          variant: 'destructive',
          duration: 10000,
        });
        // Trigger callback immediately so component can open modal
        onConflictsDetected(conflictPairs);
      } else {
        toast({
          title: '🔴 Conflicte detectate',
          description: `${conflictPairs.length} eveniment${conflictPairs.length === 1 ? '' : 'e'} se suprapun${conflictPairs.length === 1 ? 'e' : ''}`,
          variant: 'destructive',
        });
      }
    }

    return conflictPairs;
  }, [items, settings.pushEnabled, sendPushNotification, sendEmailNotification, onConflictsDetected]);

  // Run all checks
  const runAllChecks = useCallback(() => {
    checkDeadlines();
    checkOverload();
    checkConflicts();
  }, [checkDeadlines, checkOverload, checkConflicts]);

  return {
    permission,
    requestPermission,
    sendPushNotification,
    checkDeadlines,
    checkOverload,
    checkConflicts,
    runAllChecks,
    detectedConflicts,
    detectedOverloads,
  };
};
