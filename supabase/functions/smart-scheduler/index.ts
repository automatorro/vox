import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

interface ProductivityData {
  mostProductiveHour?: number;
  averageFocusMinutes?: number;
  streakDays?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { items, productivityData, localHour, timezoneOffset, bufferMinutes = 15 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const now = new Date();
    const localNow = timezoneOffset !== undefined
      ? new Date(now.getTime() - timezoneOffset * 60000)
      : now;
    const currentDate = localNow.toISOString().split('T')[0];
    const currentHourValue = localHour !== undefined ? localHour : now.getHours();

    // Categorize items
    const allItems = items as ItemData[];
    const todayItems = allItems.filter((item) => {
      const itemDate = item.deadline || item.startTime || item.time;
      if (!itemDate) return false;
      return itemDate.startsWith(currentDate);
    });

    const fixedEvents = todayItems.filter(i => i.type === 'event');
    const unscheduledTasks = todayItems.filter(i => i.type === 'task' && !i.completed);
    const reminders = todayItems.filter(i => i.type === 'reminder');

    const productivity = productivityData as ProductivityData | undefined;

    const systemPrompt = `Ești un planificator inteligent de calendar. Analizezi programul utilizatorului și sugerezi blocuri de timp optime pentru task-uri.

REGULI STRICTE:
1. NU suprapune niciodată cu evenimentele existente fixe
2. Adaugă buffer de ${bufferMinutes} minute între activități
3. Plasează task-urile cu prioritate mare în orele productive ale utilizatorului
4. Respectă deadline-urile - task-urile urgente primele
5. Grupează task-uri similare când e posibil
6. Lasă pauze de 15-30 min la fiecare 2 ore de lucru
7. Nu programa nimic înainte de ${Math.max(currentHourValue, 8)}:00 sau după 21:00
8. Estimează durata realistă dacă nu e specificată (30-60 min default)

Răspunde DOAR cu JSON valid, fără text adițional.`;

    const userPrompt = `Generează un program optimizat pentru ziua de azi.

**Ora curentă:** ${currentHourValue}:00
**Ora cea mai productivă a utilizatorului:** ${productivity?.mostProductiveHour ?? 'necunoscută'}
**Media de focus zilnic:** ${productivity?.averageFocusMinutes ?? 'necunoscută'} minute
**Streak zile:** ${productivity?.streakDays ?? 0}

**Evenimente fixe (nu se pot muta):**
${fixedEvents.map(e => `- "${e.title}" la ${e.startTime ? new Date(e.startTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '?'} (${e.duration || 60} min)`).join('\n') || 'Niciunul'}

**Remindere:**
${reminders.map(r => `- "${r.title}" la ${r.time ? new Date(r.time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '?'}`).join('\n') || 'Niciunul'}

**Task-uri de programat:**
${unscheduledTasks.map(t => `- id: "${t.id}", titlu: "${t.title}", prioritate: ${t.priority || 'medium'}, durată estimată: ${t.duration || 'nespecificată'} min, deadline: ${t.deadline ? new Date(t.deadline).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : 'azi'}`).join('\n') || 'Niciunul'}

Returnează JSON cu structura:
{
  "timeBlocks": [
    {
      "itemId": "id-ul task-ului sau null pentru pauze",
      "title": "titlul activității",
      "type": "task" | "break" | "buffer",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "durationMinutes": number,
      "reason": "de ce acum - 1 propoziție scurtă"
    }
  ],
  "insights": [
    "observație sau sfat scurt despre programul generat"
  ],
  "freeSlots": [
    { "start": "HH:MM", "end": "HH:MM", "durationMinutes": number }
  ]
}`;

    console.log('Generating smart schedule, tasks:', unscheduledTasks.length, 'events:', fixedEvents.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let schedule;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      schedule = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', content);
      schedule = {
        timeBlocks: [],
        insights: ["Nu am putut genera programul. Încearcă din nou."],
        freeSlots: [],
      };
    }

    return new Response(JSON.stringify(schedule), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Smart scheduler error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
