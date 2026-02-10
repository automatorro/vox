import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemData {
  id: string;
  title: string;
  type: 'task' | 'event' | 'reminder';
  deadline?: string;
  startTime?: string;
  time?: string;
  priority?: string;
  completed?: boolean;
  duration?: number;
  categoryName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, userName, localHour, localMinutes, timezoneOffset } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const now = new Date();
    // Use client's local time if provided, otherwise fall back to server time
    const currentHour = localHour !== undefined ? localHour : now.getHours();
    const currentMinutes = localMinutes !== undefined ? localMinutes : now.getMinutes();
    // Calculate local date from timezone offset
    const localNow = timezoneOffset !== undefined 
      ? new Date(now.getTime() - timezoneOffset * 60000) 
      : now;
    const currentDate = localNow.toISOString().split('T')[0];

    // Filter items for today and upcoming week
    const todayItems = (items as ItemData[]).filter((item) => {
      const itemDate = item.deadline || item.startTime || item.time;
      if (!itemDate) return false;
      return itemDate.startsWith(currentDate);
    });

    const upcomingItems = (items as ItemData[]).filter((item) => {
      const itemDate = item.deadline || item.startTime || item.time;
      if (!itemDate) return false;
      const date = new Date(itemDate);
      const daysDiff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 0 && daysDiff <= 7;
    });

    const incompleteTasks = todayItems.filter(i => i.type === 'task' && !i.completed);
    const events = todayItems.filter(i => i.type === 'event');
    const reminders = todayItems.filter(i => i.type === 'reminder');
    const criticalTasks = incompleteTasks.filter(i => i.priority === 'critical' || i.priority === 'high');

    const greeting = currentHour < 12 ? 'Bună dimineața' : currentHour < 18 ? 'Bună ziua' : 'Bună seara';

    const systemPrompt = `Ești un asistent personal prietenos și eficient care ajută utilizatorii să-și organizeze ziua. 
Răspunde întotdeauna în limba română.
Tonul tău este cald, motivant și practic.
Oferă sfaturi concise și acționabile.
Când faci sugestii, fii specific și orientat spre rezultate.`;

    const userPrompt = `${greeting}${userName ? ` ${userName}` : ''}!

Generează un rezumat matinal personalizat bazat pe următoarele informații:

**Data de azi:** ${new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
**Ora curentă locală a utilizatorului:** ${currentHour}:${currentMinutes.toString().padStart(2, '0')}

**Taskuri pentru azi (necompletate):** ${incompleteTasks.length}
${incompleteTasks.map(t => `- ${t.title} (prioritate: ${t.priority || 'medie'})`).join('\n') || 'Niciun task'}

**Taskuri urgente/critice:** ${criticalTasks.length}
${criticalTasks.map(t => `- ${t.title}`).join('\n') || 'Niciunul'}

**Evenimente azi:** ${events.length}
${events.map(e => `- ${e.title} la ${e.startTime ? new Date(e.startTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : 'ora nespecificată'} (${e.duration || 60} min)`).join('\n') || 'Niciun eveniment'}

**Remindere azi:** ${reminders.length}
${reminders.map(r => `- ${r.title} la ${r.time ? new Date(r.time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : 'ora nespecificată'}`).join('\n') || 'Niciun reminder'}

**Itemuri în săptămâna următoare:** ${upcomingItems.length}

Te rog să generezi:
1. Un salut personalizat și motivant
2. Un rezumat scurt al zilei (2-3 propoziții)
3. Top 3 priorități pentru azi (dacă există taskuri)
4. Sugestii de organizare (2-3 sfaturi practice)
5. Un mesaj motivațional scurt

Formatează răspunsul ca JSON cu această structură:
{
  "greeting": "salut personalizat",
  "daySummary": "rezumatul zilei",
  "topPriorities": ["prioritate 1", "prioritate 2", "prioritate 3"],
  "suggestions": [
    {"tip": "titlu sugestie", "detail": "explicație scurtă"}
  ],
  "motivationalMessage": "mesaj motivațional",
  "alerts": ["alerte importante dacă există supraîncărcare sau conflicte"]
}`;

    console.log('Generating morning summary for user:', userName || 'Guest');
    console.log('Today items:', todayItems.length, 'Upcoming:', upcomingItems.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log('AI response received:', content.substring(0, 200));

    // Parse JSON from response
    let summary;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      summary = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback summary
      summary = {
        greeting: `${greeting}! Hai să facem ziua asta productivă!`,
        daySummary: incompleteTasks.length > 0 
          ? `Ai ${incompleteTasks.length} taskuri și ${events.length} evenimente pentru azi.`
          : 'Ziua ta arată liberă! Timp perfect pentru planificare.',
        topPriorities: criticalTasks.slice(0, 3).map(t => t.title),
        suggestions: [
          { tip: "Începe cu taskurile urgente", detail: "Rezolvă întâi ce e critic" }
        ],
        motivationalMessage: "Fiecare pas contează. Hai să începem!",
        alerts: []
      };
    }

    // Add metadata
    summary.metadata = {
      generatedAt: now.toISOString(),
      todayTasksCount: incompleteTasks.length,
      todayEventsCount: events.length,
      upcomingItemsCount: upcomingItems.length,
      hasCriticalTasks: criticalTasks.length > 0,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Morning summary error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
