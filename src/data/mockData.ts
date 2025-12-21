import { Task, Event, Reminder, Item } from "@/types";
import { addDays, setHours, setMinutes } from "date-fns";

const today = new Date();

export const mockItems: Item[] = [
  // Tasks
  {
    id: '1',
    type: 'task',
    title: 'Trimite raportul lunar',
    description: 'Raportul de vânzări pentru departamentul de marketing',
    deadline: addDays(today, 1),
    priority: 'high',
    completed: false,
    createdAt: new Date(),
  },
  {
    id: '2',
    type: 'task',
    title: 'Revizuiește contractul nou',
    deadline: today,
    priority: 'critical',
    completed: false,
    createdAt: new Date(),
  },
  {
    id: '3',
    type: 'task',
    title: 'Cumpără cadou pentru Maria',
    deadline: addDays(today, 3),
    priority: 'medium',
    completed: true,
    createdAt: new Date(),
  },
  {
    id: '4',
    type: 'task',
    title: 'Actualizează portofoliul',
    description: 'Adaugă ultimele 3 proiecte',
    deadline: addDays(today, 5),
    priority: 'low',
    completed: false,
    createdAt: new Date(),
  },

  // Events
  {
    id: '5',
    type: 'event',
    title: 'Ședință cu echipa de design',
    startTime: setMinutes(setHours(today, 10), 0),
    duration: 60,
    synced: true,
    createdAt: new Date(),
  },
  {
    id: '6',
    type: 'event',
    title: 'Call cu clientul Acme Corp',
    startTime: setMinutes(setHours(today, 14), 30),
    duration: 45,
    synced: true,
    createdAt: new Date(),
  },
  {
    id: '7',
    type: 'event',
    title: 'Training AI & Automation',
    startTime: setMinutes(setHours(addDays(today, 1), 9), 0),
    duration: 120,
    synced: false,
    createdAt: new Date(),
  },

  // Reminders
  {
    id: '8',
    type: 'reminder',
    title: 'Sună furnizorul de internet',
    time: setMinutes(setHours(today, 11), 0),
    notified: false,
    createdAt: new Date(),
  },
  {
    id: '9',
    type: 'reminder',
    title: 'Ia medicamentele',
    time: setMinutes(setHours(today, 20), 0),
    notified: false,
    createdAt: new Date(),
  },
] as Item[];
