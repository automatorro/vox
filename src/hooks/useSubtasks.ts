import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Subtask {
  id: string;
  item_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateSubtaskData {
  item_id: string;
  title: string;
  sort_order?: number;
}

export interface UpdateSubtaskData {
  id: string;
  title?: string;
  completed?: boolean;
  sort_order?: number;
}

export const useSubtasks = (itemId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subtasks for a specific item
  const { data: subtasks = [], isLoading, error } = useQuery({
    queryKey: ['subtasks', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('item_id', itemId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!itemId && !!user,
  });

  // Create subtask
  const createSubtask = useMutation({
    mutationFn: async (data: CreateSubtaskData) => {
      if (!user) throw new Error('User not authenticated');

      const { data: result, error } = await supabase
        .from('subtasks')
        .insert({
          item_id: data.item_id,
          user_id: user.id,
          title: data.title,
          sort_order: data.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result as Subtask;
    },
    onSuccess: (newSubtask) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', newSubtask.item_id] });
      queryClient.invalidateQueries({ queryKey: ['subtasks-count'] });
    },
    onError: (error) => {
      console.error('Error creating subtask:', error);
      toast.error('Eroare la crearea subtask-ului');
    },
  });

  // Update subtask
  const updateSubtask = useMutation({
    mutationFn: async (data: UpdateSubtaskData) => {
      const { data: result, error } = await supabase
        .from('subtasks')
        .update({
          title: data.title,
          completed: data.completed,
          sort_order: data.sort_order,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result as Subtask;
    },
    onSuccess: (updatedSubtask) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', updatedSubtask.item_id] });
      queryClient.invalidateQueries({ queryKey: ['subtasks-count'] });
    },
    onError: (error) => {
      console.error('Error updating subtask:', error);
      toast.error('Eroare la actualizarea subtask-ului');
    },
  });

  // Delete subtask
  const deleteSubtask = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      return subtaskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', itemId] });
      queryClient.invalidateQueries({ queryKey: ['subtasks-count'] });
    },
    onError: (error) => {
      console.error('Error deleting subtask:', error);
      toast.error('Eroare la ștergerea subtask-ului');
    },
  });

  // Toggle subtask completion
  const toggleSubtask = useMutation({
    mutationFn: async (subtaskId: string) => {
      const subtask = subtasks.find(s => s.id === subtaskId);
      if (!subtask) throw new Error('Subtask not found');

      const { data: result, error } = await supabase
        .from('subtasks')
        .update({ completed: !subtask.completed })
        .eq('id', subtaskId)
        .select()
        .single();

      if (error) throw error;
      return result as Subtask;
    },
    onSuccess: (updatedSubtask) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', updatedSubtask.item_id] });
      queryClient.invalidateQueries({ queryKey: ['subtasks-count'] });
    },
    onError: (error) => {
      console.error('Error toggling subtask:', error);
      toast.error('Eroare la actualizarea subtask-ului');
    },
  });

  // Calculate progress
  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    subtasks,
    isLoading,
    error,
    createSubtask: createSubtask.mutate,
    updateSubtask: updateSubtask.mutate,
    deleteSubtask: deleteSubtask.mutate,
    toggleSubtask: toggleSubtask.mutate,
    isCreating: createSubtask.isPending,
    isUpdating: updateSubtask.isPending,
    isDeleting: deleteSubtask.isPending,
    progress,
    completedCount,
    totalCount,
  };
};

// Hook to get subtask counts for multiple items (for ItemCard progress bars)
export const useSubtaskCounts = (itemIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subtasks-count', itemIds],
    queryFn: async () => {
      if (!itemIds.length) return {};
      
      const { data, error } = await supabase
        .from('subtasks')
        .select('item_id, completed')
        .in('item_id', itemIds);

      if (error) throw error;

      // Group by item_id and calculate counts
      const counts: Record<string, { completed: number; total: number }> = {};
      
      itemIds.forEach(id => {
        counts[id] = { completed: 0, total: 0 };
      });

      data.forEach((subtask) => {
        if (!counts[subtask.item_id]) {
          counts[subtask.item_id] = { completed: 0, total: 0 };
        }
        counts[subtask.item_id].total++;
        if (subtask.completed) {
          counts[subtask.item_id].completed++;
        }
      });

      return counts;
    },
    enabled: !!user && itemIds.length > 0,
  });
};
