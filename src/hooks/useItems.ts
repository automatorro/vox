import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Item, Task, Event, Reminder, RecurrenceType } from '@/types';

type DbItemType = 'task' | 'event' | 'reminder';
type DbPriority = 'low' | 'medium' | 'high' | 'critical';
type DbRecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

interface DbItem {
  id: string;
  user_id: string;
  type: DbItemType;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: DbPriority | null;
  completed: boolean | null;
  start_time: string | null;
  duration: number | null;
  synced: boolean | null;
  google_id: string | null;
  time: string | null;
  notified: boolean | null;
  category_id: string | null;
  recurrence_type: DbRecurrenceType | null;
  recurrence_end_date: string | null;
  parent_item_id: string | null;
  created_at: string;
  updated_at: string;
}

const dbItemToItem = (dbItem: DbItem): Item => {
  const base = {
    id: dbItem.id,
    createdAt: new Date(dbItem.created_at),
    recurrenceType: (dbItem.recurrence_type as RecurrenceType) ?? 'none',
    recurrenceEndDate: dbItem.recurrence_end_date ? new Date(dbItem.recurrence_end_date) : undefined,
    parentItemId: dbItem.parent_item_id ?? undefined,
  };

  if (dbItem.type === 'task') {
    return {
      ...base,
      type: 'task',
      title: dbItem.title,
      description: dbItem.description ?? undefined,
      deadline: dbItem.deadline ? new Date(dbItem.deadline) : new Date(),
      priority: dbItem.priority ?? 'medium',
      importance: 'low',
      completed: dbItem.completed ?? false,
      duration: dbItem.duration ?? undefined,
      categoryId: dbItem.category_id ?? undefined,
    } as Task;
  }

  if (dbItem.type === 'event') {
    return {
      ...base,
      type: 'event',
      title: dbItem.title,
      startTime: dbItem.start_time ? new Date(dbItem.start_time) : new Date(),
      duration: dbItem.duration ?? 60,
      synced: dbItem.synced ?? false,
      googleId: dbItem.google_id ?? undefined,
    } as Event;
  }

  return {
    ...base,
    type: 'reminder',
    title: dbItem.title,
    time: dbItem.time ? new Date(dbItem.time) : new Date(),
    notified: dbItem.notified ?? false,
  } as Reminder;
};

export const useItems = (userId: string | undefined) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      console.error('Error fetching items:', error);
    } else {
      const mappedItems = (data as DbItem[]).map(dbItemToItem);
      setItems(mappedItems);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (item: Omit<Item, 'id' | 'createdAt'>): Promise<Item | null> => {
    if (!userId) return null;

    const dbData: Record<string, unknown> = {
      user_id: userId,
      type: item.type,
      title: item.title,
      recurrence_type: item.recurrenceType ?? 'none',
      recurrence_end_date: item.recurrenceEndDate?.toISOString() ?? null,
      parent_item_id: item.parentItemId ?? null,
    };

    if (item.type === 'task') {
      const task = item as Omit<Task, 'id' | 'createdAt'>;
      dbData.description = task.description ?? null;
      dbData.deadline = task.deadline?.toISOString() ?? null;
      dbData.priority = task.priority ?? 'medium';
      dbData.completed = task.completed ?? false;
      dbData.duration = task.duration ?? null;
      dbData.category_id = task.categoryId ?? null;
    } else if (item.type === 'event') {
      const event = item as Omit<Event, 'id' | 'createdAt'>;
      dbData.start_time = event.startTime?.toISOString() ?? null;
      dbData.duration = event.duration ?? 60;
      dbData.synced = event.synced ?? false;
      dbData.google_id = event.googleId ?? null;
    } else {
      const reminder = item as Omit<Reminder, 'id' | 'createdAt'>;
      dbData.time = reminder.time?.toISOString() ?? null;
      dbData.notified = reminder.notified ?? false;
    }

    const { data, error } = await supabase
      .from('items')
      .insert(dbData as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating item:', error);
      return null;
    }

    const newItem = dbItemToItem(data as DbItem);
    setItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateItem = async (item: Item): Promise<boolean> => {
    if (!userId) return false;

    const dbData: Record<string, unknown> = {
      title: item.title,
      recurrence_type: item.recurrenceType ?? 'none',
      recurrence_end_date: item.recurrenceEndDate?.toISOString() ?? null,
    };

    if (item.type === 'task') {
      const task = item as Task;
      dbData.description = task.description ?? null;
      dbData.deadline = task.deadline?.toISOString() ?? null;
      dbData.priority = task.priority;
      dbData.completed = task.completed;
      dbData.duration = task.duration ?? null;
      dbData.category_id = task.categoryId ?? null;
    } else if (item.type === 'event') {
      const event = item as Event;
      dbData.start_time = event.startTime?.toISOString() ?? null;
      dbData.duration = event.duration;
      dbData.synced = event.synced;
      dbData.google_id = event.googleId ?? null;
    } else {
      const reminder = item as Reminder;
      dbData.time = reminder.time?.toISOString() ?? null;
      dbData.notified = reminder.notified;
    }

    const { error } = await supabase
      .from('items')
      .update(dbData as any)
      .eq('id', item.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating item:', error);
      return false;
    }

    setItems(prev => prev.map(i => i.id === item.id ? item : i));
    return true;
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting item:', error);
      return false;
    }

    setItems(prev => prev.filter(i => i.id !== id));
    return true;
  };

  const toggleTaskComplete = async (id: string): Promise<boolean> => {
    const item = items.find(i => i.id === id);
    if (!item || item.type !== 'task') return false;

    const task = item as Task;
    const updatedTask = { ...task, completed: !task.completed };
    return updateItem(updatedTask);
  };

  return {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    toggleTaskComplete,
    refetch: fetchItems,
    setItems,
  };
};
