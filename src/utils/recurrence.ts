import { isSameDay, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";
import { Item, Task, Event, Reminder, RecurrenceType } from "@/types";

/**
 * Gets the primary date of an item (deadline for tasks, startTime for events, time for reminders)
 */
export const getItemDate = (item: Item): Date => {
  if (item.type === 'task') return new Date((item as Task).deadline);
  if (item.type === 'event') return new Date((item as Event).startTime);
  return new Date((item as Reminder).time);
};

/**
 * Checks if a recurring item should appear on a given date
 */
const isRecurringOnDate = (itemDate: Date, targetDate: Date, recurrenceType: RecurrenceType, recurrenceEndDate?: Date): boolean => {
  // Target date must be on or after the item's original date
  if (targetDate < itemDate && !isSameDay(targetDate, itemDate)) return false;

  // If there's an end date, target must be before or on it
  if (recurrenceEndDate && targetDate > recurrenceEndDate && !isSameDay(targetDate, recurrenceEndDate)) return false;

  switch (recurrenceType) {
    case 'daily':
      return true; // Every day between start and end
    case 'weekly': {
      const diffDays = differenceInDays(targetDate, itemDate);
      return diffDays % 7 === 0;
    }
    case 'monthly': {
      return itemDate.getDate() === targetDate.getDate();
    }
    case 'yearly': {
      return itemDate.getDate() === targetDate.getDate() && itemDate.getMonth() === targetDate.getMonth();
    }
    default:
      return false;
  }
};

/**
 * Returns items that should appear on a given date, accounting for recurrence
 */
export const getItemsForDate = (items: Item[], date: Date): Item[] => {
  return items.filter(item => {
    const itemDate = getItemDate(item);

    // Direct date match (always show)
    if (isSameDay(itemDate, date)) return true;

    // Check recurrence
    const recurrenceType = item.recurrenceType;
    if (!recurrenceType || recurrenceType === 'none') return false;

    return isRecurringOnDate(itemDate, date, recurrenceType, item.recurrenceEndDate);
  });
};
