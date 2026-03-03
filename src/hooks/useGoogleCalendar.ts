import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { useToast } from '@/hooks/use-toast';

const SCOPES = 'https://www.googleapis.com/auth/calendar';

interface GoogleCalendarEvent {
  googleId: string;
  title: string;
  startTime: string;
  endTime: string;
}

export const useGoogleCalendar = (onEventsImported: (events: Event[]) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch Google Client ID from edge function
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-auth-config');
        if (!error && data?.clientId) {
          setGoogleClientId(data.clientId);
        }
      } catch (e) {
        console.error('Failed to fetch Google Client ID:', e);
      }
    };
    fetchClientId();
  }, []);

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('google_calendar_token');
    const tokenExpiry = localStorage.getItem('google_calendar_token_expiry');
    
    if (storedToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      if (Date.now() < expiryTime) {
        setAccessToken(storedToken);
        setIsConnected(true);
      } else {
        // Token expired, clear it
        localStorage.removeItem('google_calendar_token');
        localStorage.removeItem('google_calendar_token_expiry');
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!googleClientId) {
      toast({
        title: "Configurare necesară",
        description: "Google Client ID nu este configurat. Adaugă VITE_GOOGLE_CLIENT_ID în setări.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create OAuth URL
      const redirectUri = `${window.location.origin}/`;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('prompt', 'consent');

      // Open popup for OAuth
      const popup = window.open(
        authUrl.toString(),
        'Google Calendar Login',
        'width=500,height=600,menubar=no,toolbar=no'
      );

      if (!popup) {
        toast({
          title: "Popup blocat",
          description: "Permite popup-urile pentru acest site pentru a te conecta la Google Calendar.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Listen for OAuth callback
      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            setIsLoading(false);
            return;
          }

          const popupUrl = popup.location.href;
          if (popupUrl.includes('access_token=')) {
            const hash = popup.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            const expiresIn = params.get('expires_in');
            
            if (token) {
              const expiryTime = Date.now() + (parseInt(expiresIn || '3600', 10) * 1000);
              localStorage.setItem('google_calendar_token', token);
              localStorage.setItem('google_calendar_token_expiry', expiryTime.toString());
              
              setAccessToken(token);
              setIsConnected(true);
              
              toast({
                title: "Conectat la Google Calendar!",
                description: "Evenimentele tale vor fi sincronizate.",
              });
            }

            popup.close();
            clearInterval(checkPopup);
            setIsLoading(false);
          }
        } catch (e) {
          // Cross-origin error, popup is on different domain - ignore
        }
      }, 500);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkPopup);
        setIsLoading(false);
        if (popup && !popup.closed) {
          popup.close();
        }
      }, 120000);

    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: "Eroare la conectare",
        description: "Nu s-a putut conecta la Google Calendar.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [toast, googleClientId]);

  const disconnect = useCallback(() => {
    localStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_calendar_token_expiry');
    setAccessToken(null);
    setIsConnected(false);
    
    toast({
      title: "Deconectat",
      description: "Nu mai ești conectat la Google Calendar.",
    });
  }, [toast]);

  const syncEvents = useCallback(async () => {
    if (!accessToken) {
      toast({
        title: "Nu ești conectat",
        description: "Conectează-te la Google Calendar pentru a sincroniza.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'list', accessToken },
      });

      if (error) throw error;

      if (data?.events) {
        const importedEvents: Event[] = data.events.map((gEvent: GoogleCalendarEvent) => {
          const startTime = new Date(gEvent.startTime);
          const endTime = new Date(gEvent.endTime);
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

          return {
            id: `gcal-${gEvent.googleId}`,
            type: 'event' as const,
            title: gEvent.title,
            startTime,
            duration,
            synced: true,
            googleId: gEvent.googleId,
            createdAt: new Date(),
          };
        });

        onEventsImported(importedEvents);
        
        toast({
          title: "Sincronizare completă!",
          description: `${importedEvents.length} evenimente importate din Google Calendar.`,
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      // Check if token expired
      if (error instanceof Error && error.message.includes('401')) {
        disconnect();
        toast({
          title: "Sesiune expirată",
          description: "Reconectează-te la Google Calendar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Eroare la sincronizare",
          description: "Nu s-au putut importa evenimentele.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, onEventsImported, disconnect, toast]);

  const createEvent = useCallback(async (event: { title: string; startTime: Date; duration: number }) => {
    if (!accessToken) return null;

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'create', 
          accessToken,
          event: {
            title: event.title,
            startTime: event.startTime.toISOString(),
            duration: event.duration,
          },
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Eveniment sincronizat!",
          description: "Evenimentul a fost adăugat în Google Calendar.",
        });
        return data.googleId;
      }
    } catch (error) {
      console.error('Create event error:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut crea evenimentul în Google Calendar.",
        variant: "destructive",
      });
    }
    return null;
  }, [accessToken, toast]);

  const deleteEvent = useCallback(async (googleId: string) => {
    if (!accessToken) return false;

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'delete', 
          accessToken,
          event: { googleId },
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Eveniment șters",
          description: "Evenimentul a fost șters din Google Calendar.",
        });
        return true;
      }
    } catch (error) {
      console.error('Delete event error:', error);
    }
    return false;
  }, [accessToken, toast]);

  return {
    isConnected,
    isLoading,
    isSyncing,
    connect,
    disconnect,
    syncEvents,
    createEvent,
    deleteEvent,
  };
};
