import { useMemo, useState, useCallback } from 'react';
import { Item, Task, Event, Reminder, Priority } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Sparkles, Loader2, Calendar, Bell, CheckSquare, Pencil, Trash2, MoreVertical, GripVertical } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTouchDragDrop } from "@/hooks/useTouchDragDrop";
import { useConfirmationSound } from "@/hooks/useConfirmationSound";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EisenhowerMatrixProps {
    items: Item[];
    onUpdateItem: (item: Item) => Promise<boolean>;
    onEditItem?: (item: Item) => void;
    onDeleteItem?: (id: string) => void;
}

interface QuadrantProps {
    title: string;
    description: string;
    items: Item[];
    variant: 'do' | 'schedule' | 'delegate' | 'dolast';
    onDrop: (e: React.DragEvent, variant: 'do' | 'schedule' | 'delegate' | 'dolast') => void;
    onTouchDrop: (itemId: string, variant: 'do' | 'schedule' | 'delegate' | 'dolast') => void;
    touchDrag: ReturnType<typeof useTouchDragDrop>;
    recentlyDroppedId: string | null;
    onEditItem?: (item: Item) => void;
    onDeleteItem?: (id: string) => void;
}

const getItemIcon = (item: Item) => {
    switch (item.type) {
        case 'task':
            return <CheckSquare className="h-3.5 w-3.5 text-task" />;
        case 'event':
            return <Calendar className="h-3.5 w-3.5 text-event" />;
        case 'reminder':
            return <Bell className="h-3.5 w-3.5 text-reminder" />;
    }
};

const getItemTime = (item: Item) => {
    if (item.type === 'task') {
        return format(new Date((item as Task).deadline), 'd MMM', { locale: ro });
    } else if (item.type === 'event') {
        return format(new Date((item as Event).startTime), 'HH:mm, d MMM', { locale: ro });
    } else {
        return format(new Date((item as Reminder).time), 'HH:mm, d MMM', { locale: ro });
    }
};

const Quadrant = ({
    title,
    description,
    items,
    variant,
    onDrop,
    onTouchDrop,
    touchDrag,
    recentlyDroppedId,
    onEditItem,
    onDeleteItem,
}: QuadrantProps) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'do': return 'border-red-500/50 bg-red-500/5';
            case 'schedule': return 'border-blue-500/50 bg-blue-500/5';
            case 'delegate': return 'border-yellow-500/50 bg-yellow-500/5';
            case 'dolast': return 'border-slate-500/50 bg-slate-500/5';
        }
    };

    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <Card
            data-drop-target
            data-quadrant={variant}
            className={cn(
                "min-h-[16rem] md:h-full flex flex-col transition-all duration-200",
                getVariantStyles(),
                isDragOver && "ring-2 ring-primary scale-[1.02]",
                "[&.touch-drag-over]:ring-2 [&.touch-drag-over]:ring-primary [&.touch-drag-over]:scale-[1.02]"
            )}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                setIsDragOver(false);
                onDrop(e, variant);
            }}
        >
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                    {title}
                    <Badge variant="outline" className="text-xs font-normal">
                        {items.length}
                    </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-2">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-2">
                    {items.map(item => (
                            <div
                                key={item.id}
                                data-touch-drag-root
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('itemId', item.id)}
                                className={cn(
                                    "p-3 rounded-lg border bg-background/80 hover:bg-background shadow-sm cursor-move transition-all active:scale-95 group relative",
                                    recentlyDroppedId === item.id && "animate-drop-success"
                                )}
                            >
                                {/* Drag handle for mobile (touch + long-press) */}
                                <div
                                    className="absolute left-1 top-1/2 -translate-y-1/2 opacity-40 group-hover:opacity-70 touch-none select-none p-2 -m-2 rounded-md cursor-grab active:cursor-grabbing"
                                    onTouchStart={(e) => {
                                        e.stopPropagation();
                                        touchDrag.handleTouchStart(e, item.id);
                                    }}
                                    onTouchMove={touchDrag.handleTouchMove}
                                    onTouchEnd={touchDrag.handleTouchEnd}
                                    onTouchCancel={touchDrag.handleTouchCancel}
                                >
                                    <GripVertical className="h-4 w-4" />
                                </div>
                                
                                <div className="flex items-start gap-2 pl-4">
                                    <div className="mt-0.5">{getItemIcon(item)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm line-clamp-2 pr-6">{item.title}</div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span>{getItemTime(item)}</span>
                                            {item.type === 'task' && (
                                                <Badge variant="secondary" className="scale-75 origin-left">
                                                    {(item as Task).priority}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Actions Menu */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-popover">
                                            <DropdownMenuItem 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditItem?.(item);
                                                }} 
                                                className="gap-2 cursor-pointer"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Editează
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteItem?.(item.id);
                                                }} 
                                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Șterge
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                        {items.length === 0 && (
                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50 italic py-8">
                                Trage itemi aici
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

// Get priority/importance from item type
const getItemPriorityInfo = (item: Item): { isUrgent: boolean; isImportant: boolean } => {
    if (item.type === 'task') {
        const task = item as Task;
        return {
            isUrgent: ['high', 'critical'].includes(task.priority),
            isImportant: task.importance === 'high'
        };
    }
    // For events and reminders, default to urgent if today/soon, important by default
    const itemDate = item.type === 'event' 
        ? new Date((item as Event).startTime) 
        : new Date((item as Reminder).time);
    const now = new Date();
    const daysDiff = Math.ceil((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
        isUrgent: daysDiff <= 1, // Today or tomorrow = urgent
        isImportant: true // Events and reminders are important by default
    };
};

export const EisenhowerMatrix = ({ items, onUpdateItem, onEditItem, onDeleteItem }: EisenhowerMatrixProps) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recentlyDroppedId, setRecentlyDroppedId] = useState<string | null>(null);
    const { toast } = useToast();
    const { playSuccessSound } = useConfirmationSound();

    const quadrants = useMemo(() => {
        const q1: Item[] = []; // Urgent & Important - Do First
        const q2: Item[] = []; // Not Urgent & Important - Schedule
        const q3: Item[] = []; // Urgent & Not Important - Delegate
        const q4: Item[] = []; // Not Urgent & Not Important - Do Last

        items.forEach(item => {
            // Tasks marked as completed shouldn't appear in the matrix
            // (matrix is for prioritizing what still needs attention)
            if (item.type === 'task' && (item as Task).completed) {
                return;
            }

            const { isUrgent, isImportant } = getItemPriorityInfo(item);

            if (isUrgent && isImportant) q1.push(item);
            else if (!isUrgent && isImportant) q2.push(item);
            else if (isUrgent && !isImportant) q3.push(item);
            else q4.push(item);
        });

        return { q1, q2, q3, q4 };
    }, [items]);

    const getUpdatesForVariant = (variant: 'do' | 'schedule' | 'delegate' | 'dolast'): { priority: Priority; importance: 'low' | 'high' } => {
        switch (variant) {
            case 'do':
                return { priority: 'critical', importance: 'high' };
            case 'schedule':
                return { priority: 'medium', importance: 'high' };
            case 'delegate':
                return { priority: 'high', importance: 'low' };
            case 'dolast':
                return { priority: 'low', importance: 'low' };
        }
    };

    const applyUpdatesToItem = (item: Item, updates: { priority: Priority; importance: 'low' | 'high' }): Item => {
        if (item.type === 'task') {
            return { ...item, ...updates } as Task;
        }
        // For events/reminders, we store the classification conceptually
        // They don't have priority/importance fields, but we can still move them
        return item;
    };

    const handleDrop = async (e: React.DragEvent, targetVariant: 'do' | 'schedule' | 'delegate' | 'dolast') => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('itemId');
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        if (item.type === 'task') {
            const updates = getUpdatesForVariant(targetVariant);
            await onUpdateItem({ ...item, ...updates } as Task);
        }
        
        // Trigger success animation and sound
        playSuccessSound();
        setRecentlyDroppedId(itemId);
        setTimeout(() => setRecentlyDroppedId(null), 500);
    };

    const handleTouchDrop = useCallback(async (itemId: string, targetVariant: 'do' | 'schedule' | 'delegate' | 'dolast') => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        if (item.type === 'task') {
            const updates = getUpdatesForVariant(targetVariant);
            await onUpdateItem({ ...item, ...updates } as Task);
        }
        
        // Trigger success animation and sound
        playSuccessSound();
        setRecentlyDroppedId(itemId);
        setTimeout(() => setRecentlyDroppedId(null), 500);
    }, [items, onUpdateItem, playSuccessSound]);

    // Touch drag and drop
    const touchDrag = useTouchDragDrop({
        dropTargetSelector: '[data-quadrant]',
        onDragEnd: (id, dropTarget) => {
            if (dropTarget) {
                const variant = dropTarget.getAttribute('data-quadrant') as 'do' | 'schedule' | 'delegate' | 'dolast';
                if (variant) {
                    handleTouchDrop(id, variant);
                }
            }
        },
    });

    const handleAutoMatrix = async () => {
        const tasks = items.filter(i => i.type === 'task') as Task[];
        if (tasks.length === 0) {
            toast({
                title: "Niciun task de clasificat",
                description: "Adaugă task-uri pentru a folosi clasificarea AI.",
            });
            return;
        }

        setIsAnalyzing(true);
        try {
            const { data, error } = await supabase.functions.invoke('ai-matrix', {
                body: {
                    tasks: tasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        deadline: t.deadline,
                        priority: t.priority
                    }))
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            if (data.updates && Array.isArray(data.updates)) {
                let count = 0;
                for (const update of data.updates) {
                    const task = tasks.find(t => t.id === update.id);
                    if (task) {
                        onUpdateItem({
                            ...task,
                            priority: update.priority,
                            importance: update.importance
                        });
                        count++;
                    }
                }
                toast({
                    title: "Matrice actualizată! 🤖",
                    description: `${count} task-uri au fost reclasificate de AI.`,
                });
            }
        } catch (error) {
            console.error("AI Matrix error:", error);
            toast({
                title: "Eroare AI",
                description: "Nu s-a putut face clasificarea automată.",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-4 h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex justify-between items-center px-1">
                <h2 className="text-lg font-semibold tracking-tight">Matricea Eisenhower</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoMatrix}
                    disabled={isAnalyzing}
                    className="gap-2"
                >
                    {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4 text-purple-500" />
                    )}
                    Auto-Clasificare AI
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto pb-6">
                <Quadrant
                    title="Fă Acum"
                    description="Urgent & Important"
                    items={quadrants.q1}
                    variant="do"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                    recentlyDroppedId={recentlyDroppedId}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                />
                <Quadrant
                    title="Programează"
                    description="Nu e Urgent & Important"
                    items={quadrants.q2}
                    variant="schedule"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                    recentlyDroppedId={recentlyDroppedId}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                />
                <Quadrant
                    title="Delegă"
                    description="Urgent & Nu e Important"
                    items={quadrants.q3}
                    variant="delegate"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                    recentlyDroppedId={recentlyDroppedId}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                />
                <Quadrant
                    title="Fă Ultimul"
                    description="Nu e Urgent & Nu e Important"
                    items={quadrants.q4}
                    variant="dolast"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                    recentlyDroppedId={recentlyDroppedId}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                />
            </div>
        </div>
    );
};
