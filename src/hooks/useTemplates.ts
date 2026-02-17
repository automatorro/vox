import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TemplateItem {
  type: 'task' | 'event' | 'reminder';
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  importance?: 'low' | 'high';
  duration?: number;
  relativeTimeMinutes?: number; // minutes from start of day
  categoryId?: string;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  description?: string;
  itemsJson: TemplateItem[];
  isRoutine: boolean;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

const PREDEFINED_TEMPLATES: Omit<Template, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Rutină Dimineață',
    description: 'Începe ziua cu energie și focus',
    icon: '🌅',
    isRoutine: true,
    itemsJson: [
      { type: 'task', title: 'Meditație 10 minute', priority: 'medium', importance: 'high', duration: 10, relativeTimeMinutes: 420 },
      { type: 'task', title: 'Exerciții fizice', priority: 'medium', importance: 'high', duration: 30, relativeTimeMinutes: 435 },
      { type: 'task', title: 'Planifică ziua', priority: 'high', importance: 'high', duration: 15, relativeTimeMinutes: 480 },
      { type: 'task', title: 'Top 3 priorități', priority: 'critical', importance: 'high', duration: 5, relativeTimeMinutes: 495 },
    ],
  },
  {
    name: 'Review Săptămânal',
    description: 'Reflecție și planificare pentru săptămâna viitoare',
    icon: '📊',
    isRoutine: true,
    itemsJson: [
      { type: 'task', title: 'Revizuiește task-urile completate', priority: 'high', importance: 'high', duration: 20 },
      { type: 'task', title: 'Analizează ce nu a mers bine', priority: 'high', importance: 'high', duration: 15 },
      { type: 'task', title: 'Stabilește obiective pt. săptămâna viitoare', priority: 'critical', importance: 'high', duration: 20 },
      { type: 'task', title: 'Curăță inbox și notificări', priority: 'medium', importance: 'low', duration: 15 },
    ],
  },
  {
    name: 'Deep Work',
    description: 'Bloc de muncă concentrată fără întreruperi',
    icon: '🎯',
    isRoutine: false,
    itemsJson: [
      { type: 'reminder', title: 'Activează modul Nu Deranja' },
      { type: 'task', title: 'Sesiune deep work #1', priority: 'critical', importance: 'high', duration: 90 },
      { type: 'task', title: 'Pauză scurtă', priority: 'low', importance: 'low', duration: 10 },
      { type: 'task', title: 'Sesiune deep work #2', priority: 'critical', importance: 'high', duration: 90 },
    ],
  },
];

export const useTemplates = (userId?: string) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(
        (data || []).map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          name: t.name,
          description: t.description,
          itemsJson: t.items_json as TemplateItem[],
          isRoutine: t.is_routine,
          icon: t.icon || '📋',
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }))
      );
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (template: {
    name: string;
    description?: string;
    itemsJson: TemplateItem[];
    isRoutine: boolean;
    icon?: string;
  }) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: userId,
        name: template.name,
        description: template.description || null,
        items_json: template.itemsJson as any,
        is_routine: template.isRoutine,
        icon: template.icon || '📋',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Eroare', description: 'Nu s-a putut crea template-ul', variant: 'destructive' });
      return null;
    }

    await fetchTemplates();
    return data;
  };

  const updateTemplate = async (id: string, updates: Partial<{
    name: string;
    description: string;
    itemsJson: TemplateItem[];
    isRoutine: boolean;
    icon: string;
  }>) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.itemsJson !== undefined) updateData.items_json = updates.itemsJson;
    if (updates.isRoutine !== undefined) updateData.is_routine = updates.isRoutine;
    if (updates.icon !== undefined) updateData.icon = updates.icon;

    const { error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId!);

    if (error) {
      toast({ title: 'Eroare', description: 'Nu s-a putut actualiza template-ul', variant: 'destructive' });
      return false;
    }

    await fetchTemplates();
    return true;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId!);

    if (error) {
      toast({ title: 'Eroare', description: 'Nu s-a putut șterge template-ul', variant: 'destructive' });
      return false;
    }

    await fetchTemplates();
    return true;
  };

  const savePredefinedTemplate = async (predefined: typeof PREDEFINED_TEMPLATES[number]) => {
    return createTemplate({
      name: predefined.name,
      description: predefined.description,
      itemsJson: predefined.itemsJson,
      isRoutine: predefined.isRoutine,
      icon: predefined.icon,
    });
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    predefinedTemplates: PREDEFINED_TEMPLATES,
    savePredefinedTemplate,
    refetch: fetchTemplates,
  };
};
