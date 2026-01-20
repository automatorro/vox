import { useState, useEffect, useCallback } from "react";
import { isSameDay, format } from "date-fns";
import { ro } from "date-fns/locale";
import { LayoutDashboard, CalendarDays, Plus, LogOut, Loader2, Sparkles, Grid, Target } from "lucide-react";
import { Header } from "@/components/Header";
import { VoiceButton } from "@/components/VoiceButton";
import { VoiceConfirmationModal } from "@/components/VoiceConfirmationModal";
import { VoiceConversationalModal } from "@/components/VoiceConversationalModal";
import { MorningSummaryModal } from "@/components/MorningSummaryModal";
import { DayView } from "@/components/DayView";
import { MiniCalendar } from "@/components/MiniCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { QuickStats } from "@/components/QuickStats";
import { CreateItemDrawer } from "@/components/CreateItemDrawer";
import { EditItemDrawer } from "@/components/EditItemDrawer";
import { NotificationSettings } from "@/components/NotificationSettings";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { AIPrioritization } from "@/components/AIPrioritization";
import { CategoryFilter } from "@/components/CategoryFilter";
import { EisenhowerMatrix } from "@/components/EisenhowerMatrix";
import { ConflictResolutionModal, ConflictPair } from "@/components/ConflictResolutionModal";
import { OverloadResolutionModal, OverloadedDay } from "@/components/OverloadResolutionModal";
import { FocusMode } from "@/components/FocusMode";
import { Item, Task, Event, Reminder, VoiceParseResult } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useItems } from "@/hooks/useItems";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = 'dashboard' | 'calendar' | 'matrix';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [googleCalendarSettingsOpen, setGoogleCalendarSettingsOpen] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: false,
    emailEnabled: false,
    email: '',
  });
  const [voiceConfirmationOpen, setVoiceConfirmationOpen] = useState(false);
  const [voiceConversationalOpen, setVoiceConversationalOpen] = useState(false);
  const [morningSummaryOpen, setMorningSummaryOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [activeConflicts, setActiveConflicts] = useState<ConflictPair[]>([]);
  const [overloadModalOpen, setOverloadModalOpen] = useState(false);
  const [activeOverloads, setActiveOverloads] = useState<OverloadedDay[]>([]);
  const [voiceParseResult, setVoiceParseResult] = useState<VoiceParseResult | null>(null);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const { toast } = useToast();
  const { user, profile, signOut } = useAuth();
  const { items, loading: itemsLoading, createItem, updateItem, deleteItem, toggleTaskComplete, reorderItems, setItems } = useItems(user?.id);
  const { categories, createCategory } = useCategories(user?.id);

  // Google Calendar integration
  const handleEventsImported = (importedEvents: Event[]) => {
    setItems(prev => {
      // Remove old synced events and add new ones
      const nonSyncedItems = prev.filter(item =>
        item.type !== 'event' || !(item as Event).synced
      );
      return [...nonSyncedItems, ...importedEvents];
    });
  };

  const {
    isConnected: isGoogleConnected,
    isLoading: isGoogleLoading,
    isSyncing: isGoogleSyncing,
    connect: connectGoogle,
    disconnect: disconnectGoogle,
    syncEvents: syncGoogleEvents,
    createEvent: createGoogleEvent,
    deleteEvent: deleteGoogleEvent,
  } = useGoogleCalendar(handleEventsImported);

  // Callback when conflicts are detected
  const handleConflictsDetected = useCallback((conflicts: ConflictPair[]) => {
    setActiveConflicts(conflicts);
    setConflictModalOpen(true);
  }, []);

  // Callback when overload is detected
  const handleOverloadDetected = useCallback((overloadedDays: OverloadedDay[]) => {
    setActiveOverloads(overloadedDays);
    setOverloadModalOpen(true);
  }, []);

  const {
    permission,
    requestPermission,
    runAllChecks,
    detectedConflicts,
    detectedOverloads,
  } = useNotifications(items, notificationSettings, handleConflictsDetected, handleOverloadDetected);

  // Sync notification settings from profile
  useEffect(() => {
    if (profile) {
      setNotificationSettings(prev => ({
        ...prev,
        pushEnabled: profile.notification_push_enabled,
        emailEnabled: profile.notification_email_enabled,
      }));
    }
  }, [profile]);

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
          ? (item as Event).startTime
          : (item as any).time;
      return isSameDay(new Date(itemDate), date);
    });
  };

  const allTasks = items.filter(item => item.type === 'task') as Task[];
  const filteredItems = filterCategoryId
    ? items.filter(item => item.type === 'task' && (item as Task).categoryId === filterCategoryId)
    : items;
  const todayItems = getItemsForDate(selectedDate).filter(item =>
    !filterCategoryId || (item.type === 'task' && (item as Task).categoryId === filterCategoryId)
  );
  const isOverloaded = todayItems.length > 6;

  const handleReorderTasks = (orderedIds: string[]) => {
    // Reorder items based on AI suggestion (visual reorder for today's view)
    setItems(prev => {
      const orderedTasks = orderedIds
        .map(id => prev.find(item => item.id === id))
        .filter(Boolean) as Item[];
      const nonTasks = prev.filter(item => item.type !== 'task');
      const unorderedTasks = prev.filter(
        item => item.type === 'task' && !orderedIds.includes(item.id)
      );
      return [...orderedTasks, ...unorderedTasks, ...nonTasks];
    });
  };

  const handleCompleteTask = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.type !== 'task') return;

    const task = item as Task;
    const success = await toggleTaskComplete(id);

    if (success) {
      toast({
        title: !task.completed ? "Task completat! 🎉" : "Task reactivat",
        description: task.title,
      });
    }
  };

  const handleCalendarClick = () => {
    setViewMode(viewMode === 'calendar' ? 'dashboard' : 'calendar');
  };

  const handleDaySelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
    setViewMode('dashboard');
  };

  const handleCreateItem = async (newItem: Item) => {
    // If it's an event and Google Calendar is connected, sync it
    let googleId: string | undefined;
    if (newItem.type === 'event' && isGoogleConnected) {
      const event = newItem as Event;
      googleId = await createGoogleEvent({
        title: event.title,
        startTime: new Date(event.startTime),
        duration: event.duration,
      }) || undefined;
    }

    const itemToCreate = {
      ...newItem,
      ...(googleId && { googleId, synced: true }),
    };

    const created = await createItem(itemToCreate);

    if (created) {
      const typeLabels = {
        task: 'Task',
        event: 'Eveniment',
        reminder: 'Reminder'
      };

      toast({
        title: `${typeLabels[created.type]} creat!`,
        description: created.title,
      });
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setEditDrawerOpen(true);
  };

  const handleUpdateItem = async (updatedItem: Item): Promise<boolean> => {
    const success = await updateItem(updatedItem);

    if (success) {
      const typeLabels = {
        task: 'Task',
        event: 'Eveniment',
        reminder: 'Reminder'
      };

      toast({
        title: `${typeLabels[updatedItem.type]} actualizat!`,
        description: updatedItem.title,
      });
    }
    return success;
  };

  const handleDeleteItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // If it's a synced event, delete from Google Calendar too
    if (item.type === 'event' && isGoogleConnected && (item as Event).googleId) {
      await deleteGoogleEvent((item as Event).googleId!);
    }

    const success = await deleteItem(id);

    if (success) {
      const typeLabels = {
        task: 'Task',
        event: 'Eveniment',
        reminder: 'Reminder'
      };

      toast({
        title: `${typeLabels[item.type]} șters!`,
        description: item.title,
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "La revedere! 👋",
      description: "Te-ai deconectat cu succes",
    });
  };

  const handleMoveItemToDate = async (itemId: string, newDate: Date) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    let updatedItem: Item;

    if (item.type === 'task') {
      updatedItem = { ...item, deadline: newDate } as Task;
    } else if (item.type === 'event') {
      const event = item as Event;
      // Preserve the time, just change the date
      const oldDate = new Date(event.startTime);
      const newDateTime = new Date(newDate);
      newDateTime.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
      updatedItem = { ...event, startTime: newDateTime };
    } else {
      const reminder = item as Reminder;
      const oldTime = new Date(reminder.time);
      const newDateTime = new Date(newDate);
      newDateTime.setHours(oldTime.getHours(), oldTime.getMinutes(), 0, 0);
      updatedItem = { ...reminder, time: newDateTime };
    }

    const success = await updateItem(updatedItem);
    if (success) {
      toast({
        title: "Item mutat! 📅",
        description: `"${item.title}" a fost mutat în ${format(newDate, 'd MMMM', { locale: ro })}`,
      });
    }
  };

  if (itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCalendarClick={handleCalendarClick}
        onSettingsClick={() => setNotificationSettingsOpen(true)}
        onGoogleCalendarClick={() => setGoogleCalendarSettingsOpen(true)}
        isGoogleConnected={isGoogleConnected}
        conflictCount={detectedConflicts.length}
        onConflictsClick={() => setConflictModalOpen(true)}
        overloadCount={detectedOverloads.length}
        onOverloadClick={() => setOverloadModalOpen(true)}
      />

      {/* User info & View Toggle */}
      <div className="px-6 mb-4 flex items-center justify-between">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('matrix')}
            className={cn(
              "gap-2 rounded-lg transition-all",
              viewMode === 'matrix' && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Grid className="h-4 w-4" />
            Matrix
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Focus Mode Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFocusModeOpen(true)}
            className="gap-2"
          >
            <Target className="h-4 w-4 text-task" />
            <span className="hidden sm:inline">Focus</span>
          </Button>

          {/* AI Summary Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMorningSummaryOpen(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Rezumat AI</span>
          </Button>

          <span className="text-sm text-muted-foreground">
            {profile?.full_name || user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8"
            title="Deconectare"
          >
            <LogOut className="h-4 w-4" />
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

            {/* Category Filter */}
            <section className="mb-4">
              <CategoryFilter
                categories={categories}
                selectedCategoryId={filterCategoryId}
                onSelect={setFilterCategoryId}
              />
            </section>

            {/* AI Prioritization */}
            <section className="mb-6">
              <AIPrioritization
                tasks={allTasks}
                onReorder={handleReorderTasks}
              />
            </section>

            {/* Mini Calendar */}
            <section className="mb-6">
              <MiniCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                items={items}
              />
            </section>

            <section>
              <DayView
                date={selectedDate}
                items={todayItems}
                categories={categories}
                overloaded={isOverloaded}
                onCompleteTask={handleCompleteTask}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onReorderItems={reorderItems}
              />
            </section>
          </>
        ) : viewMode === 'calendar' ? (
          <MonthCalendar
            items={items}
            selectedDate={selectedDate}
            onDaySelect={handleDaySelectFromCalendar}
            onMoveItemToDate={handleMoveItemToDate}
          />
        ) : (
          <EisenhowerMatrix
            items={items}
            onUpdateItem={handleUpdateItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
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
        <VoiceButton
          onParseComplete={(result) => {
            setVoiceParseResult(result);
            // All intents now go to conversational modal which handles create too
            setVoiceConversationalOpen(true);
          }}
          existingItems={items}
          categories={categories}
        />
      </div>

      {/* Voice Conversational Modal - handles all intents including create */}
      <VoiceConversationalModal
        open={voiceConversationalOpen}
        onOpenChange={setVoiceConversationalOpen}
        parseResult={voiceParseResult}
        categories={categories}
        onConfirmCreate={handleCreateItem}
      />

      {/* Morning Summary Modal */}
      <MorningSummaryModal
        open={morningSummaryOpen}
        onOpenChange={setMorningSummaryOpen}
        items={items}
        userName={profile?.full_name || undefined}
      />

      {/* Create Item Drawer */}
      <CreateItemDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        onCreateItem={handleCreateItem}
        categories={categories}
        onCreateCategory={createCategory}
      />

      {/* Edit Item Drawer */}
      <EditItemDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        item={editingItem}
        onUpdateItem={handleUpdateItem}
        categories={categories}
        onCreateCategory={createCategory}
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

      {/* Google Calendar Settings */}
      <GoogleCalendarSettings
        open={googleCalendarSettingsOpen}
        onOpenChange={setGoogleCalendarSettingsOpen}
        isConnected={isGoogleConnected}
        isLoading={isGoogleLoading}
        isSyncing={isGoogleSyncing}
        onConnect={connectGoogle}
        onDisconnect={disconnectGoogle}
        onSync={syncGoogleEvents}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        conflicts={activeConflicts.length > 0 ? activeConflicts : detectedConflicts}
        onReschedule={(eventId) => {
          const event = items.find(i => i.id === eventId);
          if (event) {
            setEditingItem(event);
            setEditDrawerOpen(true);
            setConflictModalOpen(false);
          }
        }}
        onDelete={(eventId) => {
          handleDeleteItem(eventId);
          setActiveConflicts(prev => prev.filter(c => 
            c.event1.id !== eventId && c.event2.id !== eventId
          ));
        }}
        onIgnore={() => {
          // Simply hide from active conflicts, the actual list is managed by the modal
        }}
      />

      {/* Overload Resolution Modal */}
      <OverloadResolutionModal
        open={overloadModalOpen}
        onOpenChange={setOverloadModalOpen}
        overloadedDays={activeOverloads.length > 0 ? activeOverloads : detectedOverloads}
        allItems={items}
        onReschedule={handleMoveItemToDate}
        onDelete={handleDeleteItem}
        onEditItem={(item) => {
          setEditingItem(item);
          setEditDrawerOpen(true);
          setOverloadModalOpen(false);
        }}
      />

      {/* Focus Mode */}
      <FocusMode
        open={focusModeOpen}
        onOpenChange={setFocusModeOpen}
        tasks={allTasks}
        onCompleteTask={handleCompleteTask}
      />
    </div>
  );
};

export default Index;
