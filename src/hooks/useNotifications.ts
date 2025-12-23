import { useState, useEffect, useCallback } from 'react';
import { Item, Task } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, differenceInHours, startOfDay, isSameDay } from 'date-fns';
import { ro } from 'date-fns/locale';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  email: string;
}

const OVERLOAD_THRESHOLD = 5; // Max items per day before warning
const DEADLINE_WARNING_HOURS = 24; // Warn 24h before deadline

export const useNotifications = (items: Item[], settings: NotificationSettings) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

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
  const checkOverload = useCallback(() => {
    const dayMap = new Map<string, Item[]>();

    items.forEach((item) => {
      let itemDate: Date;
      
      if (item.type === 'task') {
        itemDate = (item as Task).deadline;
      } else if (item.type === 'event') {
        itemDate = (item as any).startTime;
      } else {
        itemDate = (item as any).time;
      }

      const dayKey = format(startOfDay(itemDate), 'yyyy-MM-dd');
      
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey)!.push(item);
    });

    const overloadedDays: Array<{ date: string; count: number; items: Item[] }> = [];

    dayMap.forEach((dayItems, dateKey) => {
      if (dayItems.length >= OVERLOAD_THRESHOLD) {
        overloadedDays.push({
          date: dateKey,
          count: dayItems.length,
          items: dayItems,
        });
      }
    });

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

      // Toast notification
      toast({
        title: '⚠️ Supraîncărcare detectată',
        description: `Ai ${overloadedDays[0].count} itemi pentru ${format(new Date(overloadedDays[0].date), 'd MMMM', { locale: ro })}`,
      });
    }

    return overloadedDays;
  }, [items, settings.pushEnabled, sendPushNotification, sendEmailNotification]);

  // Check for conflicts (overlapping events)
  const checkConflicts = useCallback(() => {
    const events = items.filter((item) => item.type === 'event') as any[];
    const conflicts: Array<{ title: string }> = [];

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
          conflicts.push({ title: event1.title });
          conflicts.push({ title: event2.title });
        }
      }
    }

    if (conflicts.length > 0) {
      const uniqueConflicts = conflicts.filter(
        (item, index, self) => self.findIndex((t) => t.title === item.title) === index
      );

      // Push notification
      if (settings.pushEnabled) {
        sendPushNotification(
          '🔴 Conflict de programare!',
          `${uniqueConflicts.length} evenimente se suprapun.`
        );
      }

      // Email notification
      sendEmailNotification('conflict', uniqueConflicts);

      // Toast notification
      toast({
        title: '🔴 Conflict detectat',
        description: `${uniqueConflicts.length} evenimente se suprapun`,
        variant: 'destructive',
      });

      return uniqueConflicts;
    }

    return [];
  }, [items, settings.pushEnabled, sendPushNotification, sendEmailNotification]);

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
  };
};
