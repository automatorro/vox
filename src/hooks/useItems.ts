import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Item, Task, Event, Reminder, RecurrenceType } from '@/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type DbItemType = 'task' | 'event' | 'reminder';
type DbPriority = 'low' | 'medium' | 'high' | 'critical';
type DbRecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

type DbImportance = 'low' | 'high';

interface DbItem {
  id: string;
  user_id: string;
  type: DbItemType;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: DbPriority | null;
  importance: DbImportance | null;
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
  sort_order: number | null;
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
    sortOrder: dbItem.sort_order ?? 0,
  };

  if (dbItem.type === 'task') {
    return {
      ...base,
      type: 'task',
      title: dbItem.title,
      description: dbItem.description ?? undefined,
      deadline: dbItem.deadline ? new Date(dbItem.deadline) : new Date(),
      priority: dbItem.priority ?? 'medium',
      importance: dbItem.importance ?? 'low',
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
      .order('sort_order', { ascending: true })
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

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Realtime subscription for live sync across all views
  useEffect(() => {
    if (!userId) return;

    console.log('Setting up realtime subscription for items');

    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbItem>) => {
          console.log('Realtime change received:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            const newItem = dbItemToItem(payload.new as DbItem);
            setItems(prev => {
              // Avoid duplicates (in case we already added it optimistically)
              if (prev.some(i => i.id === newItem.id)) {
                return prev;
              }
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = dbItemToItem(payload.new as DbItem);
            setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setItems(prev => prev.filter(i => i.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createItem = async (item: Omit<Item, 'id' | 'createdAt'>): Promise<Item | null> => {
    if (!userId) return null;

    const dbData: Record<string, unknown> = {
      user_id: userId,
      type: item.type,
      title: item.title,
      recurrence_type: item.recurrenceType ?? 'none',
      recurrence_end_date: item.recurrenceEndDate?.toISOString() ?? null,
      parent_item_id: item.parentItemId ?? null,
      sort_order: item.sortOrder ?? 0,
    };

    if (item.type === 'task') {
      const task = item as Omit<Task, 'id' | 'createdAt'>;
      dbData.description = task.description ?? null;
      dbData.deadline = task.deadline?.toISOString() ?? null;
      dbData.priority = task.priority ?? 'medium';
      dbData.importance = task.importance ?? 'low';
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
    // Optimistic update (realtime will also trigger, but we handle duplicates)
    setItems(prev => {
      if (prev.some(i => i.id === newItem.id)) {
        return prev;
      }
      return [newItem, ...prev];
    });
    return newItem;
  };

  const updateItem = async (item: Item): Promise<boolean> => {
    if (!userId) return false;

    // Optimistic update for instant UI feedback
    setItems(prev => prev.map(i => i.id === item.id ? item : i));

    const dbData: Record<string, unknown> = {
      title: item.title,
      recurrence_type: item.recurrenceType ?? 'none',
      recurrence_end_date: item.recurrenceEndDate?.toISOString() ?? null,
      sort_order: item.sortOrder ?? 0,
    };

    if (item.type === 'task') {
      const task = item as Task;
      dbData.description = task.description ?? null;
      dbData.deadline = task.deadline?.toISOString() ?? null;
      dbData.priority = task.priority;
      dbData.importance = task.importance;
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
      // Revert optimistic update on error
      await fetchItems();
      return false;
    }

    return true;
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    if (!userId) return false;

    // Optimistic delete for instant UI feedback
    setItems(prev => prev.filter(i => i.id !== id));

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting item:', error);
      // Revert on error
      await fetchItems();
      return false;
    }

    return true;
  };

  const toggleTaskComplete = async (id: string): Promise<boolean> => {
    const item = items.find(i => i.id === id);
    if (!item || item.type !== 'task') return false;

    const task = item as Task;
    const updatedTask = { ...task, completed: !task.completed };
    return updateItem(updatedTask);
  };

  const reorderItems = async (reorderedItems: Item[]): Promise<boolean> => {
    if (!userId) return false;

    // Update local state immediately for responsiveness
    setItems(prev => {
      const otherItems = prev.filter(
        item => !reorderedItems.find(r => r.id === item.id)
      );
      return [...reorderedItems, ...otherItems];
    });

    // Persist to database
    try {
      const updates = reorderedItems.map((item, index) => 
        supabase
          .from('items')
          .update({ sort_order: index } as any)
          .eq('id', item.id)
          .eq('user_id', userId)
      );

      await Promise.all(updates);
      return true;
    } catch (error) {
      console.error('Error reordering items:', error);
      return false;
    }
  };

  return {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    toggleTaskComplete,
    reorderItems,
    refetch: fetchItems,
    setItems,
  };
};
