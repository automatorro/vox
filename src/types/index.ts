export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  type: 'task';
  title: string;
  description?: string;
  deadline: Date;
  priority: Priority;
  completed: boolean;
  createdAt: Date;
}

export interface Event {
  id: string;
  type: 'event';
  title: string;
  startTime: Date;
  duration: number; // in minutes
  synced: boolean;
  googleId?: string; // Google Calendar event ID for synced events
  createdAt: Date;
}

export interface Reminder {
  id: string;
  type: 'reminder';
  title: string;
  time: Date;
  notified: boolean;
  createdAt: Date;
}

export type Item = Task | Event | Reminder;

export interface DaySchedule {
  date: Date;
  items: Item[];
  overloaded: boolean;
  conflicts: string[];
}
