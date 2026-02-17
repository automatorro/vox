import { useState } from 'react';
import { Plus, Trash2, Play, Copy, ChevronRight, Pencil, BookTemplate } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Template, TemplateItem, useTemplates } from '@/hooks/useTemplates';
import { Item, Task, Event, Reminder } from '@/types';

interface TemplatesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onApplyTemplate: (items: Item[]) => void;
}

type View = 'list' | 'create' | 'detail';

export const TemplatesDrawer = ({ open, onOpenChange, userId, onApplyTemplate }: TemplatesDrawerProps) => {
  const { templates, loading, createTemplate, deleteTemplate, predefinedTemplates, savePredefinedTemplate } = useTemplates(userId);
  const [view, setView] = useState<View>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('📋');
  const [newIsRoutine, setNewIsRoutine] = useState(false);
  const [newItems, setNewItems] = useState<TemplateItem[]>([{ type: 'task', title: '', priority: 'medium' }]);
  const { toast } = useToast();

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewIcon('📋');
    setNewIsRoutine(false);
    setNewItems([{ type: 'task', title: '', priority: 'medium' }]);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const validItems = newItems.filter(i => i.title.trim());
    if (validItems.length === 0) {
      toast({ title: 'Adaugă cel puțin un item', variant: 'destructive' });
      return;
    }
    const result = await createTemplate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      itemsJson: validItems,
      isRoutine: newIsRoutine,
      icon: newIcon,
    });
    if (result) {
      toast({ title: 'Template creat! 📋' });
      resetForm();
      setView('list');
    }
  };

  const handleApply = (template: Template | { itemsJson: TemplateItem[] }) => {
    const now = new Date();
    const items: Item[] = template.itemsJson.map((ti, idx) => {
      const baseDate = new Date(now);
      if (ti.relativeTimeMinutes !== undefined) {
        baseDate.setHours(0, 0, 0, 0);
        baseDate.setMinutes(ti.relativeTimeMinutes);
      }

      const id = crypto.randomUUID();

      if (ti.type === 'task') {
        return {
          id,
          type: 'task' as const,
          title: ti.title,
          deadline: baseDate,
          priority: ti.priority || 'medium',
          importance: ti.importance || 'low',
          completed: false,
          duration: ti.duration,
          categoryId: ti.categoryId,
          createdAt: now,
          sortOrder: idx,
        } as Task;
      } else if (ti.type === 'event') {
        return {
          id,
          type: 'event' as const,
          title: ti.title,
          startTime: baseDate,
          duration: ti.duration || 60,
          synced: false,
          createdAt: now,
          sortOrder: idx,
        } as Event;
      } else {
        return {
          id,
          type: 'reminder' as const,
          title: ti.title,
          time: baseDate,
          notified: false,
          createdAt: now,
          sortOrder: idx,
        } as Reminder;
      }
    });

    onApplyTemplate(items);
    onOpenChange(false);
    toast({ title: 'Template aplicat! ✅', description: `${items.length} item(e) create` });
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteTemplate(id);
    if (ok) {
      toast({ title: 'Template șters' });
      if (selectedTemplate?.id === id) setView('list');
    }
  };

  const addItemRow = () => {
    setNewItems(prev => [...prev, { type: 'task', title: '', priority: 'medium' }]);
  };

  const updateItemRow = (idx: number, updates: Partial<TemplateItem>) => {
    setNewItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const removeItemRow = (idx: number) => {
    setNewItems(prev => prev.filter((_, i) => i !== idx));
  };

  const icons = ['📋', '🌅', '📊', '🎯', '💪', '📚', '🧹', '🎨', '💼', '🏃'];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-primary" />
            {view === 'list' ? 'Template-uri & Rutine' : view === 'create' ? 'Template Nou' : selectedTemplate?.name}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6" style={{ maxHeight: '70vh' }}>
          {view === 'list' && (
            <div className="space-y-4">
              {/* Create button */}
              <Button onClick={() => { resetForm(); setView('create'); }} className="w-full gap-2" variant="outline">
                <Plus className="h-4 w-4" /> Creează Template Nou
              </Button>

              {/* User templates */}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Template-urile tale</h3>
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <span className="text-xl">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{t.name}</span>
                          {t.isRoutine && <Badge variant="secondary" className="text-[10px] px-1.5">Rutină</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{t.itemsJson.length} itemi</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedTemplate(t); setView('detail'); }}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Predefined templates */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Sugerate</h3>
                {predefinedTemplates.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-card/50 hover:bg-accent/50 transition-colors">
                    <span className="text-xl">{pt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{pt.name}</span>
                      <p className="text-xs text-muted-foreground">{pt.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Aplică acum" onClick={() => handleApply({ itemsJson: pt.itemsJson })}>
                        <Play className="h-3.5 w-3.5 text-task" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Salvează" onClick={async () => {
                        const saved = await savePredefinedTemplate(pt);
                        if (saved) toast({ title: 'Template salvat! 📋' });
                      }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'detail' && selectedTemplate && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setView('list')} className="mb-2">
                ← Înapoi
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{selectedTemplate.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
                  {selectedTemplate.description && (
                    <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Itemi în template ({selectedTemplate.itemsJson.length})</h3>
                {selectedTemplate.itemsJson.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                    <Badge variant={item.type === 'task' ? 'default' : item.type === 'event' ? 'secondary' : 'outline'} className="text-[10px]">
                      {item.type}
                    </Badge>
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.duration && <span className="text-xs text-muted-foreground">{item.duration}min</span>}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1 gap-2" onClick={() => handleApply(selectedTemplate)}>
                  <Play className="h-4 w-4" /> Aplică Acum
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(selectedTemplate.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setView('list')} className="mb-2">
                ← Înapoi
              </Button>

              {/* Icon picker */}
              <div>
                <label className="text-sm font-medium mb-1 block">Icon</label>
                <div className="flex gap-1 flex-wrap">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewIcon(icon)}
                      className={`text-xl p-1.5 rounded-md transition-colors ${newIcon === icon ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-accent'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nume</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ex: Rutina de seară" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Descriere (opțional)</label>
                <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Ce face acest template?" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isRoutine" checked={newIsRoutine} onChange={e => setNewIsRoutine(e.target.checked)} className="rounded" />
                <label htmlFor="isRoutine" className="text-sm">Este rutină (se repetă regulat)</label>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Itemi</label>
                  <Button variant="ghost" size="sm" onClick={addItemRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adaugă
                  </Button>
                </div>

                {newItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                    <select
                      value={item.type}
                      onChange={e => updateItemRow(idx, { type: e.target.value as any })}
                      className="text-xs bg-transparent border rounded px-1 py-0.5"
                    >
                      <option value="task">Task</option>
                      <option value="event">Event</option>
                      <option value="reminder">Reminder</option>
                    </select>
                    <Input
                      value={item.title}
                      onChange={e => updateItemRow(idx, { title: e.target.value })}
                      placeholder="Titlu item..."
                      className="h-8 text-sm flex-1"
                    />
                    <Input
                      type="number"
                      value={item.duration || ''}
                      onChange={e => updateItemRow(idx, { duration: parseInt(e.target.value) || undefined })}
                      placeholder="min"
                      className="h-8 text-sm w-16"
                    />
                    {newItems.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItemRow(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={!newName.trim()}>
                Creează Template
              </Button>
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
