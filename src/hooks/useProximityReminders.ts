import { useEffect, useRef, useCallback } from 'react';
import { Item, Task, Event, Reminder } from '@/types';
import { SavedLocation } from './useLocations';
import { useToast } from '@/hooks/use-toast';

// Haversine distance in meters
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface UseProximityRemindersProps {
  items: Item[];
  locations: SavedLocation[];
  currentPosition: { lat: number; lng: number } | null;
  enabled: boolean;
}

export const useProximityReminders = ({
  items,
  locations,
  currentPosition,
  enabled,
}: UseProximityRemindersProps) => {
  const { toast } = useToast();
  const notifiedIds = useRef<Set<string>>(new Set());

  const checkProximity = useCallback(() => {
    if (!currentPosition || !enabled || locations.length === 0) return;

    // Find which saved locations we're near
    const nearbyLocations = locations.filter(loc => {
      const dist = getDistance(currentPosition.lat, currentPosition.lng, loc.latitude, loc.longitude);
      return dist <= loc.radiusMeters;
    });

    if (nearbyLocations.length === 0) return;

    const nearbyLocationIds = new Set(nearbyLocations.map(l => l.id));

    // Find items linked to nearby locations that haven't been notified
    const itemsToNotify = items.filter(item => {
      const locationId = (item as any).locationId;
      if (!locationId || !nearbyLocationIds.has(locationId)) return false;
      if (notifiedIds.current.has(item.id)) return false;
      // Don't notify completed tasks
      if (item.type === 'task' && (item as Task).completed) return false;
      return true;
    });

    for (const item of itemsToNotify) {
      const location = nearbyLocations.find(l => l.id === (item as any).locationId);
      if (!location) continue;

      notifiedIds.current.add(item.id);

      toast({
        title: `${location.icon} Ești lângă ${location.name}!`,
        description: `Nu uita: "${item.title}"`,
        duration: 8000,
      });

      // Also try browser notification
      if (Notification.permission === 'granted') {
        new Notification(`${location.icon} Ești lângă ${location.name}!`, {
          body: `Nu uita: "${item.title}"`,
          tag: `proximity-${item.id}`,
        });
      }
    }
  }, [currentPosition, items, locations, enabled, toast]);

  useEffect(() => {
    if (!enabled) return;
    checkProximity();
  }, [currentPosition, checkProximity, enabled]);

  // Reset notifications daily
  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timeout = midnight.getTime() - Date.now();
    const timer = setTimeout(() => notifiedIds.current.clear(), timeout);
    return () => clearTimeout(timer);
  }, []);

  return { checkProximity };
};
