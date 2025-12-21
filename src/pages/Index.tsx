import { useState } from "react";
import { isSameDay } from "date-fns";
import { Header } from "@/components/Header";
import { VoiceButton } from "@/components/VoiceButton";
import { DayView } from "@/components/DayView";
import { MiniCalendar } from "@/components/MiniCalendar";
import { QuickStats } from "@/components/QuickStats";
import { mockItems } from "@/data/mockData";
import { Item, Task } from "@/types";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<Item[]>(mockItems);
  const { toast } = useToast();

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

  const handleVoiceActivate = () => {
    toast({
      title: "Ascult...",
      description: "Spune ce ai de făcut și eu mă ocup de restul.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="px-6 pb-32">
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
          />
        </section>
      </main>

      {/* Floating Voice Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <VoiceButton onActivate={handleVoiceActivate} />
      </div>
    </div>
  );
};

export default Index;
