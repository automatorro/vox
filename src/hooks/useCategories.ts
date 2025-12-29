import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

interface DbCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export const useCategories = (userId: string | undefined) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      const mapped = (data as DbCategory[]).map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        createdAt: new Date(c.created_at),
      }));
      setCategories(mapped);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name: string, color: string): Promise<Category | null> => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name, color })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return null;
    }

    const newCat: Category = {
      id: data.id,
      name: data.name,
      color: data.color,
      createdAt: new Date(data.created_at),
    };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting category:', error);
      return false;
    }

    setCategories(prev => prev.filter(c => c.id !== id));
    return true;
  };

  return {
    categories,
    loading,
    createCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
};
