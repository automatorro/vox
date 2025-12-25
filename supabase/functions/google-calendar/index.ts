import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, event } = await req.json();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarId = 'primary';
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`;

    if (action === 'list') {
      // Get events from the last 30 days to next 90 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const url = `${baseUrl}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`;
      
      console.log('Fetching Google Calendar events...');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Calendar API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch events', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const events = (data.items || []).map((item: GoogleEvent) => ({
        googleId: item.id,
        title: item.summary || 'Untitled Event',
        startTime: item.start.dateTime || item.start.date,
        endTime: item.end.dateTime || item.end.date,
      }));

      console.log(`Fetched ${events.length} events from Google Calendar`);

      return new Response(
        JSON.stringify({ events }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create') {
      if (!event) {
        return new Response(
          JSON.stringify({ error: 'Event data required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const startDate = new Date(event.startTime);
      const endDate = new Date(startDate.getTime() + (event.duration || 60) * 60 * 1000);

      const googleEvent = {
        summary: event.title,
        start: { dateTime: startDate.toISOString(), timeZone: 'Europe/Bucharest' },
        end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Bucharest' },
      };

      console.log('Creating Google Calendar event:', googleEvent);

      const response = await fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create event:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create event', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const createdEvent = await response.json();
      console.log('Event created successfully:', createdEvent.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          googleId: createdEvent.id,
          event: {
            googleId: createdEvent.id,
            title: createdEvent.summary,
            startTime: createdEvent.start.dateTime || createdEvent.start.date,
            endTime: createdEvent.end.dateTime || createdEvent.end.date,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      if (!event?.googleId) {
        return new Response(
          JSON.stringify({ error: 'Google event ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Deleting Google Calendar event:', event.googleId);

      const response = await fetch(`${baseUrl}/events/${event.googleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        console.error('Failed to delete event:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to delete event', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Event deleted successfully');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      if (!event?.googleId) {
        return new Response(
          JSON.stringify({ error: 'Google event ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const startDate = new Date(event.startTime);
      const endDate = new Date(startDate.getTime() + (event.duration || 60) * 60 * 1000);

      const googleEvent = {
        summary: event.title,
        start: { dateTime: startDate.toISOString(), timeZone: 'Europe/Bucharest' },
        end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Bucharest' },
      };

      console.log('Updating Google Calendar event:', event.googleId, googleEvent);

      const response = await fetch(`${baseUrl}/events/${event.googleId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update event:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to update event', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updatedEvent = await response.json();
      console.log('Event updated successfully');

      return new Response(
        JSON.stringify({ 
          success: true,
          event: {
            googleId: updatedEvent.id,
            title: updatedEvent.summary,
            startTime: updatedEvent.start.dateTime || updatedEvent.start.date,
            endTime: updatedEvent.end.dateTime || updatedEvent.end.date,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-calendar function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
