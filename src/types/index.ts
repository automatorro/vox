export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  type: 'task';
  title: string;
  description?: string;
  deadline: Date;
  priority: Priority;
  importance: 'low' | 'high';
  completed: boolean;
  duration?: number; // estimated time in minutes
  categoryId?: string;
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

// Voice AI types
export interface VoiceParsedItem {
  type: 'task' | 'event' | 'reminder';
  title: string;
  deadline?: string;
  priority?: Priority;
  startTime?: string;
  duration?: number;
  time?: string;
  categoryId?: string;
}

export interface VoiceAIWarning {
  type: 'conflict' | 'overload' | 'deadline' | 'suggestion';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface VoiceAISuggestion {
  action: 'reschedule' | 'priority' | 'category' | 'duration';
  message: string;
  suggestedValue?: string;
}

export interface VoiceQueryResult {
  id: string;
  title: string;
  type: string;
  time: string;
  priority?: string;
}

export interface VoicePlanSuggestion {
  order: number;
  itemId?: string;
  action: 'do first' | 'postpone' | 'delegate' | 'break down' | 'time block';
  reason: string;
}

export interface VoiceParseResult {
  intent: 'create' | 'modify' | 'delete' | 'query' | 'plan';
  item: VoiceParsedItem;
  conversationalResponse?: string;
  queryResults?: VoiceQueryResult[];
  planSuggestions?: VoicePlanSuggestion[];
  warnings: VoiceAIWarning[];
  suggestions: VoiceAISuggestion[];
  confidence: number;
  requiresConfirmation: boolean;
  transcript: string;
}
