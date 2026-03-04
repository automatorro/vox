import { useState } from "react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarIcon, Clock, Plus, CheckCircle2, Calendar, Bell, Repeat } from "lucide-react";
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
import { CategorySelect } from "@/components/CategorySelect";
import { TagSelect } from "@/components/TagSelect";
import { LocationSelect } from "@/components/LocationSelect";
import { Category } from "@/hooks/useCategories";
import { Tag } from "@/hooks/useTags";
import { SavedLocation } from "@/hooks/useLocations";
import { Task, Event, Reminder, Priority, Item, RecurrenceType } from "@/types";
import { cn } from "@/lib/utils";

type ItemType = 'task' | 'event' | 'reminder';

interface CreateItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateItem: (item: Item, tagIds?: string[]) => void;
  categories: Category[];
  onCreateCategory: (name: string, color: string) => Promise<Category | null>;
  tags: Tag[];
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
  locations: SavedLocation[];
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

export const CreateItemDrawer = ({ open, onOpenChange, onCreateItem, categories, onCreateCategory, tags, onCreateTag, locations }: CreateItemDrawerProps) => {
  const [selectedType, setSelectedType] = useState<ItemType>('task');
  
  // Common fields
  const [title, setTitle] = useState('');
  
  // Task fields
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(new Date());
  const [priority, setPriority] = useState<Priority>('medium');
  const [taskDuration, setTaskDuration] = useState('30');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  
  // Event fields
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('10:00');
  const [eventDuration, setEventDuration] = useState('60');
  
  // Reminder fields
  const [reminderDate, setReminderDate] = useState<Date | undefined>(new Date());
  const [reminderTime, setReminderTime] = useState('09:00');
  
  // Recurrence fields
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeadline(new Date());
    setPriority('medium');
    setTaskDuration('30');
    setCategoryId(null);
    setStartDate(new Date());
    setStartTime('10:00');
    setEventDuration('60');
    setReminderDate(new Date());
    setReminderTime('09:00');
    setRecurrenceType('none');
    setRecurrenceEndDate(undefined);
    setSelectedTagIds([]);
    setLocationId(null);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const id = crypto.randomUUID();
    const createdAt = new Date();

    let newItem: Item;

    switch (selectedType) {
      case 'task':
        newItem = {
          id,
          type: 'task',
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline || new Date(),
          priority,
          completed: false,
          duration: parseInt(taskDuration) || undefined,
          categoryId: categoryId || undefined,
          createdAt,
          recurrenceType,
          recurrenceEndDate: recurrenceType !== 'none' ? recurrenceEndDate : undefined,
          locationId: locationId || undefined,
        } as Task;
        break;
      
      case 'event':
        const [hours, minutes] = startTime.split(':').map(Number);
        const eventStartTime = new Date(startDate || new Date());
        eventStartTime.setHours(hours, minutes, 0, 0);
        
        newItem = {
          id,
          type: 'event',
          title: title.trim(),
          startTime: eventStartTime,
          duration: parseInt(eventDuration),
          synced: false,
          createdAt,
          recurrenceType,
          recurrenceEndDate: recurrenceType !== 'none' ? recurrenceEndDate : undefined,
          locationId: locationId || undefined,
        } as Event;
        break;
      
      case 'reminder':
        const [rHours, rMinutes] = reminderTime.split(':').map(Number);
        const reminderDateTime = new Date(reminderDate || new Date());
        reminderDateTime.setHours(rHours, rMinutes, 0, 0);
        
        newItem = {
          id,
          type: 'reminder',
          title: title.trim(),
          time: reminderDateTime,
          notified: false,
          createdAt,
          recurrenceType,
          recurrenceEndDate: recurrenceType !== 'none' ? recurrenceEndDate : undefined,
          locationId: locationId || undefined,
        } as Reminder;
        break;
    }

    onCreateItem(newItem, selectedTagIds.length > 0 ? selectedTagIds : undefined);
    resetForm();
    onOpenChange(false);
  };

  const isValid = title.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-card border-border">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-xl">Creează nou</SheetTitle>
          <SheetDescription>
            Adaugă un task, eveniment sau reminder
          </SheetDescription>
        </SheetHeader>

        {/* Type Selector */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(typeConfig) as ItemType[]).map((type) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            const isSelected = selectedType === type;
            
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-200",
                  isSelected 
                    ? `${config.bg} ${config.border} ${config.color}` 
                    : "border-border text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium text-sm">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-280px)]">
          {/* Title - Common */}
          <div className="space-y-2">
            <Label htmlFor="title">Titlu</Label>
            <Input
              id="title"
              placeholder={
                selectedType === 'task' ? "Ex: Trimite raportul" :
                selectedType === 'event' ? "Ex: Ședință cu echipa" :
                "Ex: Sună furnizorul"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Task-specific fields */}
          {selectedType === 'task' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">Descriere (opțional)</Label>
                <Textarea
                  id="description"
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

              <div className="space-y-2">
                <Label>Timp estimat</Label>
                <Select value={taskDuration} onValueChange={setTaskDuration}>
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
                    <SelectItem value="240">4 ore</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <CategorySelect
                categories={categories}
                selectedCategoryId={categoryId}
                onSelect={setCategoryId}
                onCreateCategory={onCreateCategory}
              />
            </>
          )}

          {/* Event-specific fields */}
          {selectedType === 'event' && (
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
                  <Label htmlFor="startTime">Ora start</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Durată</Label>
                  <Select value={eventDuration} onValueChange={setEventDuration}>
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
          {selectedType === 'reminder' && (
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
                <Label htmlFor="reminderTime">Ora</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reminderTime"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
            </>
          )}

          {/* Location Section */}
          <div className="pt-2 border-t border-border">
            <LocationSelect
              locations={locations}
              selectedLocationId={locationId}
              onSelect={setLocationId}
            />
          </div>

          {/* Tags Section */}
          <div className="pt-2 border-t border-border">
            <TagSelect
              tags={tags}
              selectedTagIds={selectedTagIds}
              onSelectionChange={setSelectedTagIds}
              onCreateTag={onCreateTag}
            />
          </div>

          {/* Recurrence Section - For all types */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <Label>Recurență</Label>
            </div>
            <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Fără recurență" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">Fără recurență</SelectItem>
                <SelectItem value="daily">Zilnic</SelectItem>
                <SelectItem value="weekly">Săptămânal</SelectItem>
                <SelectItem value="monthly">Lunar</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>

            {recurrenceType !== 'none' && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Până la data (opțional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !recurrenceEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDate ? format(recurrenceEndDate, "d MMMM yyyy", { locale: ro }) : "Fără dată de final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={recurrenceEndDate}
                      onSelect={setRecurrenceEndDate}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full h-12 text-base"
            variant={selectedType === 'task' ? 'task' : selectedType === 'event' ? 'event' : 'reminder'}
          >
            <Plus className="h-5 w-5 mr-2" />
            Creează {typeConfig[selectedType].label}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
