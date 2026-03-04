import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SavedLocation {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  icon: string;
  createdAt: Date;
}

interface DbLocation {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  icon: string;
  created_at: string;
}

const dbToLocation = (db: DbLocation): SavedLocation => ({
  id: db.id,
  name: db.name,
  address: db.address ?? undefined,
  latitude: db.latitude,
  longitude: db.longitude,
  radiusMeters: db.radius_meters,
  icon: db.icon,
  createdAt: new Date(db.created_at),
});

export const useLocations = (userId: string | undefined) => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!userId) { setLocations([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('saved_locations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLocations((data as DbLocation[]).map(dbToLocation));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const createLocation = async (loc: Omit<SavedLocation, 'id' | 'createdAt'>): Promise<SavedLocation | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('saved_locations')
      .insert({
        user_id: userId,
        name: loc.name,
        address: loc.address ?? null,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius_meters: loc.radiusMeters,
        icon: loc.icon,
      } as any)
      .select()
      .single();

    if (error || !data) return null;
    const newLoc = dbToLocation(data as DbLocation);
    setLocations(prev => [newLoc, ...prev]);
    return newLoc;
  };

  const updateLocation = async (loc: SavedLocation): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase
      .from('saved_locations')
      .update({
        name: loc.name,
        address: loc.address ?? null,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius_meters: loc.radiusMeters,
        icon: loc.icon,
      } as any)
      .eq('id', loc.id)
      .eq('user_id', userId);

    if (error) return false;
    setLocations(prev => prev.map(l => l.id === loc.id ? loc : l));
    return true;
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase
      .from('saved_locations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return false;
    setLocations(prev => prev.filter(l => l.id !== id));
    return true;
  };

  // Geolocation watching
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchId !== null) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
    setWatchId(id);
  }, [watchId]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  useEffect(() => () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); }, [watchId]);

  // Get current position once
  const getCurrentPosition = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const result = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPosition(result);
          resolve(result);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  return {
    locations,
    loading,
    createLocation,
    updateLocation,
    deleteLocation,
    currentPosition,
    startWatching,
    stopWatching,
    getCurrentPosition,
    refetch: fetchLocations,
  };
};
