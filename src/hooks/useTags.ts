import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
}

export const useTags = (userId: string | undefined) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!userId) {
      setTags([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      setTags((data || []).map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        userId: t.user_id,
        createdAt: new Date(t.created_at),
      })));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const createTag = async (name: string, color: string): Promise<Tag | null> => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: userId, name, color } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      return null;
    }

    const tag: Tag = {
      id: data.id,
      name: data.name,
      color: data.color,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
    };
    setTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    return tag;
  };

  const updateTag = async (id: string, name: string, color: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tags')
      .update({ name, color } as any)
      .eq('id', id);

    if (error) {
      console.error('Error updating tag:', error);
      return false;
    }

    setTags(prev => prev.map(t => t.id === id ? { ...t, name, color } : t));
    return true;
  };

  const deleteTag = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tag:', error);
      return false;
    }

    setTags(prev => prev.filter(t => t.id !== id));
    return true;
  };

  // Item-tag associations
  const getItemTagIds = async (itemId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('item_tags')
      .select('tag_id')
      .eq('item_id', itemId);

    if (error) {
      console.error('Error fetching item tags:', error);
      return [];
    }

    return (data || []).map(d => d.tag_id);
  };

  const setItemTags = async (itemId: string, tagIds: string[]): Promise<boolean> => {
    // Remove all existing tags for this item
    const { error: deleteError } = await supabase
      .from('item_tags')
      .delete()
      .eq('item_id', itemId);

    if (deleteError) {
      console.error('Error clearing item tags:', deleteError);
      return false;
    }

    if (tagIds.length === 0) return true;

    // Insert new tags
    const rows = tagIds.map(tagId => ({ item_id: itemId, tag_id: tagId }));
    const { error: insertError } = await supabase
      .from('item_tags')
      .insert(rows as any);

    if (insertError) {
      console.error('Error setting item tags:', insertError);
      return false;
    }

    return true;
  };

  // Bulk fetch: get tag IDs for multiple items at once
  const getItemsTagIds = async (itemIds: string[]): Promise<Record<string, string[]>> => {
    if (itemIds.length === 0) return {};

    const { data, error } = await supabase
      .from('item_tags')
      .select('item_id, tag_id')
      .in('item_id', itemIds);

    if (error) {
      console.error('Error fetching items tags:', error);
      return {};
    }

    const result: Record<string, string[]> = {};
    for (const row of data || []) {
      if (!result[row.item_id]) result[row.item_id] = [];
      result[row.item_id].push(row.tag_id);
    }
    return result;
  };

  return {
    tags,
    loading,
    createTag,
    updateTag,
    deleteTag,
    getItemTagIds,
    setItemTags,
    getItemsTagIds,
    refetch: fetchTags,
  };
};
