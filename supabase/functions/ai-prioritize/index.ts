import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ 
        suggestions: [],
        reasoning: "Nu ai taskuri de priorizat." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    
    const systemPrompt = `Ești un asistent AI expert în productivitate și managementul timpului. Analizezi taskurile utilizatorului și sugerezi ordinea optimă de execuție.

Reguli de prioritizare:
1. Taskurile cu deadline apropiat și prioritate mare sunt cele mai urgente
2. Taskurile critice au întotdeauna prioritate ridicată
3. Ia în considerare timpul estimat - grupează taskuri mici care pot fi făcute rapid
4. Evită supraîncărcarea - sugerează pauze dacă sunt multe taskuri

Niveluri de prioritate (de la mai puțin la mai urgent): low, medium, high, critical

Răspunde STRICT în format JSON cu structura:
{
  "orderedTaskIds": ["id1", "id2", ...],
  "reasoning": "Explicație pe scurt a logicii de prioritizare",
  "tips": ["Sfat 1", "Sfat 2"]
}

Data și ora curentă: ${now}`;

    const tasksDescription = tasks.map((t: any, i: number) => 
      `${i + 1}. ID: ${t.id} | Titlu: "${t.title}" | Prioritate: ${t.priority} | Deadline: ${t.deadline} | Timp estimat: ${t.duration || 30} min | Completat: ${t.completed ? 'Da' : 'Nu'}`
    ).join('\n');

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
          { role: "user", content: `Analizează și prioritizează aceste taskuri:\n\n${tasksDescription}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Prea multe cereri. Încearcă din nou mai târziu." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credite insuficiente. Adaugă fonduri în contul Lovable." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Nu s-a primit răspuns de la AI");
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Răspuns invalid de la AI");
    }

    console.log("AI prioritization result:", parsed);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in ai-prioritize function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Eroare necunoscută" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
