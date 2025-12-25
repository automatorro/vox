import { useState, useEffect } from "react";
import { isSameDay } from "date-fns";
import { LayoutDashboard, CalendarDays, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { VoiceButton } from "@/components/VoiceButton";
import { DayView } from "@/components/DayView";
import { MiniCalendar } from "@/components/MiniCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { QuickStats } from "@/components/QuickStats";
import { CreateItemDrawer } from "@/components/CreateItemDrawer";
import { EditItemDrawer } from "@/components/EditItemDrawer";
import { NotificationSettings } from "@/components/NotificationSettings";
import { mockItems } from "@/data/mockData";
import { Item, Task } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = 'dashboard' | 'calendar';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<Item[]>(mockItems);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: false,
    emailEnabled: false,
    email: '',
  });
  const { toast } = useToast();

  const {
    permission,
    requestPermission,
    runAllChecks,
  } = useNotifications(items, notificationSettings);

  // Run notification checks when items change or on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notificationSettings.pushEnabled || notificationSettings.emailEnabled) {
        runAllChecks();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [items, notificationSettings.pushEnabled, notificationSettings.emailEnabled]);

  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
      const itemDate = item.type === 'task' 
        ? (item as Task).deadline 
        : item.type === 'event' 
          ? (item as any).startTime 
          : (item as any).time;
      return isSameDay(new Date(itemDate), date);
    });
  };

  const todayItems = getItemsForDate(selectedDate);
  const isOverloaded = todayItems.length > 6;

  const handleCompleteTask = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id && item.type === 'task') {
        const task = item as Task;
        const newCompleted = !task.completed;
        
        toast({
          title: newCompleted ? "Task completat! 🎉" : "Task reactivat",
          description: task.title,
        });
        
        return { ...task, completed: newCompleted };
      }
      return item;
    }));
  };


  const handleCalendarClick = () => {
    setViewMode(viewMode === 'calendar' ? 'dashboard' : 'calendar');
  };

  const handleDaySelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
    setViewMode('dashboard');
  };

  const handleCreateItem = (newItem: Item) => {
    setItems(prev => [...prev, newItem]);
    
    const typeLabels = {
      task: 'Task',
      event: 'Eveniment',
      reminder: 'Reminder'
    };
    
    toast({
      title: `${typeLabels[newItem.type]} creat!`,
      description: newItem.title,
    });
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setEditDrawerOpen(true);
  };

  const handleUpdateItem = (updatedItem: Item) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    
    const typeLabels = {
      task: 'Task',
      event: 'Eveniment',
      reminder: 'Reminder'
    };
    
    toast({
      title: `${typeLabels[updatedItem.type]} actualizat!`,
      description: updatedItem.title,
    });
  };

  const handleDeleteItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setItems(prev => prev.filter(item => item.id !== id));
    
    const typeLabels = {
      task: 'Task',
      event: 'Eveniment',
      reminder: 'Reminder'
    };
    
    toast({
      title: `${typeLabels[item.type]} șters!`,
      description: item.title,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onCalendarClick={handleCalendarClick}
        onSettingsClick={() => setNotificationSettingsOpen(true)}
      />
      
      {/* View Toggle */}
      <div className="px-6 mb-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-card/50 border border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('dashboard')}
            className={cn(
              "gap-2 rounded-lg transition-all",
              viewMode === 'dashboard' && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('calendar')}
            className={cn(
              "gap-2 rounded-lg transition-all",
              viewMode === 'calendar' && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>

      <main className="px-6 pb-32">
        {viewMode === 'dashboard' ? (
          <>
            {/* Quick Stats */}
            <section className="mb-6">
              <QuickStats items={todayItems} />
            </section>

            {/* Mini Calendar */}
            <section className="mb-6">
              <MiniCalendar 
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                items={items}
              />
            </section>

            {/* Day View */}
            <section>
              <DayView 
                date={selectedDate}
                items={todayItems}
                overloaded={isOverloaded}
                onCompleteTask={handleCompleteTask}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
              />
            </section>
          </>
        ) : (
          <MonthCalendar 
            items={items}
            selectedDate={selectedDate}
            onDaySelect={handleDaySelectFromCalendar}
          />
        )}
      </main>

      {/* Floating Buttons */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
        {/* Add Button */}
        <Button
          variant="glass"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={() => setCreateDrawerOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Voice Button */}
        <VoiceButton onItemCreated={handleCreateItem} />
      </div>

      {/* Create Item Drawer */}
      <CreateItemDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        onCreateItem={handleCreateItem}
      />

      {/* Edit Item Drawer */}
      <EditItemDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        item={editingItem}
        onUpdateItem={handleUpdateItem}
      />

      {/* Notification Settings */}
      <NotificationSettings
        open={notificationSettingsOpen}
        onOpenChange={setNotificationSettingsOpen}
        settings={notificationSettings}
        onSettingsChange={setNotificationSettings}
        onRequestPermission={requestPermission}
        permission={permission}
      />
    </div>
  );
};

export default Index;
