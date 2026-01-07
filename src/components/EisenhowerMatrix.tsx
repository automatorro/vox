import { useMemo, useState, useCallback } from 'react';
import { Task } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTouchDragDrop } from "@/hooks/useTouchDragDrop";

interface EisenhowerMatrixProps {
    tasks: Task[];
    onUpdateTask: (task: Task) => void;
}

interface QuadrantProps {
    title: string;
    description: string;
    tasks: Task[];
    variant: 'do' | 'schedule' | 'delegate' | 'eliminate';
    onDrop: (e: React.DragEvent, variant: 'do' | 'schedule' | 'delegate' | 'eliminate') => void;
    onTouchDrop: (taskId: string, variant: 'do' | 'schedule' | 'delegate' | 'eliminate') => void;
    touchDrag: ReturnType<typeof useTouchDragDrop>;
}

const Quadrant = ({
    title,
    description,
    tasks,
    variant,
    onDrop,
    onTouchDrop,
    touchDrag,
}: QuadrantProps) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'do': return 'border-red-500/50 bg-red-500/5';
            case 'schedule': return 'border-blue-500/50 bg-blue-500/5';
            case 'delegate': return 'border-yellow-500/50 bg-yellow-500/5';
            case 'eliminate': return 'border-slate-500/50 bg-slate-500/5';
        }
    };

    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <Card
            data-drop-target
            data-quadrant={variant}
            className={cn(
                "h-full flex flex-col transition-all duration-200",
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
                        {tasks.length}
                    </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-2">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-2">
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                                onTouchStart={(e) => touchDrag.handleTouchStart(e, task.id)}
                                onTouchMove={touchDrag.handleTouchMove}
                                onTouchEnd={touchDrag.handleTouchEnd}
                                onTouchCancel={touchDrag.handleTouchCancel}
                                className="p-3 rounded-lg border bg-background/80 hover:bg-background shadow-sm cursor-move transition-all active:scale-95 group relative touch-none"
                            >
                                <div className="font-medium text-sm line-clamp-2 pr-6">{task.title}</div>
                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                    <span>{format(new Date(task.deadline), 'MMM d')}</span>
                                    <div className="flex gap-1">
                                        <Badge variant="secondary" className="scale-75 origin-right">
                                            {task.priority}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50 italic py-8">
                                Drop tasks here
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export const EisenhowerMatrix = ({ tasks, onUpdateTask }: EisenhowerMatrixProps) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { toast } = useToast();

    const quadrants = useMemo(() => {
        const q1: Task[] = []; // Urgent & Important
        const q2: Task[] = []; // Not Urgent & Important
        const q3: Task[] = []; // Urgent & Not Important
        const q4: Task[] = []; // Not Urgent & Not Important

        tasks.forEach(task => {
            const isUrgent = ['high', 'critical'].includes(task.priority);
            const isImportant = task.importance === 'high';

            if (isUrgent && isImportant) q1.push(task);
            else if (!isUrgent && isImportant) q2.push(task);
            else if (isUrgent && !isImportant) q3.push(task);
            else q4.push(task);
        });

        return { q1, q2, q3, q4 };
    }, [tasks]);

    const getUpdatesForVariant = (variant: 'do' | 'schedule' | 'delegate' | 'eliminate'): Partial<Task> => {
        switch (variant) {
            case 'do':
                return { priority: 'critical', importance: 'high' };
            case 'schedule':
                return { priority: 'medium', importance: 'high' };
            case 'delegate':
                return { priority: 'high', importance: 'low' };
            case 'eliminate':
                return { priority: 'low', importance: 'low' };
        }
    };

    const handleDrop = async (e: React.DragEvent, targetVariant: 'do' | 'schedule' | 'delegate' | 'eliminate') => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updates = getUpdatesForVariant(targetVariant);
        await onUpdateTask({ ...task, ...updates });
    };

    const handleTouchDrop = useCallback(async (taskId: string, targetVariant: 'do' | 'schedule' | 'delegate' | 'eliminate') => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updates = getUpdatesForVariant(targetVariant);
        await onUpdateTask({ ...task, ...updates });
    }, [tasks, onUpdateTask]);

    // Touch drag and drop
    const touchDrag = useTouchDragDrop({
        dropTargetSelector: '[data-quadrant]',
        onDragEnd: (id, dropTarget) => {
            if (dropTarget) {
                const variant = dropTarget.getAttribute('data-quadrant') as 'do' | 'schedule' | 'delegate' | 'eliminate';
                if (variant) {
                    handleTouchDrop(id, variant);
                }
            }
        },
    });

    const handleAutoMatrix = async () => {
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
                        onUpdateTask({
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                <Quadrant
                    title="Do First"
                    description="Urgent & Important"
                    tasks={quadrants.q1}
                    variant="do"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                />
                <Quadrant
                    title="Schedule"
                    description="Not Urgent & Important"
                    tasks={quadrants.q2}
                    variant="schedule"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                />
                <Quadrant
                    title="Delegate"
                    description="Urgent & Not Important"
                    tasks={quadrants.q3}
                    variant="delegate"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                />
                <Quadrant
                    title="Eliminate"
                    description="Not Urgent & Not Important"
                    tasks={quadrants.q4}
                    variant="eliminate"
                    onDrop={handleDrop}
                    onTouchDrop={handleTouchDrop}
                    touchDrag={touchDrag}
                />
            </div>
        </div>
    );
};
