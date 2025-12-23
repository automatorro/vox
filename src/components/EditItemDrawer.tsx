import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarIcon, Clock, Save, CheckCircle2, Calendar, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Task, Event, Reminder, Priority, Item } from "@/types";
import { cn } from "@/lib/utils";

interface EditItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onUpdateItem: (item: Item) => void;
}

const typeConfig = {
  task: {
    icon: CheckCircle2,
    label: 'Task',
    color: 'text-task',
    bg: 'bg-task/20',
    border: 'border-task/30',
  },
  event: {
    icon: Calendar,
    label: 'Eveniment',
    color: 'text-event',
    bg: 'bg-event/20',
    border: 'border-event/30',
  },
  reminder: {
    icon: Bell,
    label: 'Reminder',
    color: 'text-reminder',
    bg: 'bg-reminder/20',
    border: 'border-reminder/30',
  },
};

export const EditItemDrawer = ({ open, onOpenChange, item, onUpdateItem }: EditItemDrawerProps) => {
  // Common fields
  const [title, setTitle] = useState('');
  
  // Task fields
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(new Date());
  const [priority, setPriority] = useState<Priority>('medium');
  
  // Event fields
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState('60');
  
  // Reminder fields
  const [reminderDate, setReminderDate] = useState<Date | undefined>(new Date());
  const [reminderTime, setReminderTime] = useState('09:00');

  // Populate form when item changes
  useEffect(() => {
    if (!item) return;

    setTitle(item.title);

    if (item.type === 'task') {
      const task = item as Task;
      setDescription(task.description || '');
      setDeadline(new Date(task.deadline));
      setPriority(task.priority);
    } else if (item.type === 'event') {
      const event = item as Event;
      const eventDate = new Date(event.startTime);
      setStartDate(eventDate);
      setStartTime(format(eventDate, 'HH:mm'));
      setDuration(event.duration.toString());
    } else if (item.type === 'reminder') {
      const reminder = item as Reminder;
      const reminderDateTime = new Date(reminder.time);
      setReminderDate(reminderDateTime);
      setReminderTime(format(reminderDateTime, 'HH:mm'));
    }
  }, [item]);

  const handleSubmit = () => {
    if (!item || !title.trim()) return;

    let updatedItem: Item;

    switch (item.type) {
      case 'task':
        updatedItem = {
          ...(item as Task),
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline || new Date(),
          priority,
        };
        break;
      
      case 'event':
        const [hours, minutes] = startTime.split(':').map(Number);
        const eventStartTime = new Date(startDate || new Date());
        eventStartTime.setHours(hours, minutes, 0, 0);
        
        updatedItem = {
          ...(item as Event),
          title: title.trim(),
          startTime: eventStartTime,
          duration: parseInt(duration),
        };
        break;
      
      case 'reminder':
        const [rHours, rMinutes] = reminderTime.split(':').map(Number);
        const reminderDateTime = new Date(reminderDate || new Date());
        reminderDateTime.setHours(rHours, rMinutes, 0, 0);
        
        updatedItem = {
          ...(item as Reminder),
          title: title.trim(),
          time: reminderDateTime,
        };
        break;
      
      default:
        return;
    }

    onUpdateItem(updatedItem);
    onOpenChange(false);
  };

  if (!item) return null;

  const config = typeConfig[item.type];
  const Icon = config.icon;
  const isValid = title.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-card border-border">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-xl flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            Editează {config.label}
          </SheetTitle>
          <SheetDescription>
            Modifică detaliile itemului
          </SheetDescription>
        </SheetHeader>

        {/* Type Badge */}
        <div className="mb-6">
          <div className={cn(
            "inline-flex items-center gap-2 py-2 px-4 rounded-xl border-2",
            config.bg, config.border, config.color
          )}>
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">{config.label}</span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-280px)]">
          {/* Title - Common */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titlu</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Task-specific fields */}
          {item.type === 'task' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descriere (opțional)</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Detalii adiționale..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background",
                          !deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline ? format(deadline, "d MMM", { locale: ro }) : "Alege"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Prioritate</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Event-specific fields */}
          {item.type === 'event' && (
            <>
              <div className="space-y-2">
                <Label>Dată</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "d MMMM yyyy", { locale: ro }) : "Alege data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startTime">Ora start</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Durată</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 oră</SelectItem>
                      <SelectItem value="90">1.5 ore</SelectItem>
                      <SelectItem value="120">2 ore</SelectItem>
                      <SelectItem value="180">3 ore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Reminder-specific fields */}
          {item.type === 'reminder' && (
            <>
              <div className="space-y-2">
                <Label>Dată</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !reminderDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reminderDate ? format(reminderDate, "d MMMM yyyy", { locale: ro }) : "Alege data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={reminderDate}
                      onSelect={setReminderDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-reminderTime">Ora</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-reminderTime"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Submit Button */}
        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full h-12 text-base"
            variant={item.type === 'task' ? 'task' : item.type === 'event' ? 'event' : 'reminder'}
          >
            <Save className="h-5 w-5 mr-2" />
            Salvează modificările
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
