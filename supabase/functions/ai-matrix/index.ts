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
                updates: [],
                reasoning: "Nu ai taskuri de analizat."
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const now = new Date().toISOString();

        const systemPrompt = `Ești un asistent AI expert în productivitate și Matricea Eisenhower.
Analizează taskurile și le clasifică în cele 4 cadrane prin setarea 'priority' (Urgență) și 'importance' (Importanță).

MATRICEA EISENHOWER:
1. DO FIRST (Urgent & Important):
   - Deadline azi/mâine SAU impact critic imediat.
   - Set: priority='critical' (sau 'high'), importance='high'
   
2. SCHEDULE (Not Urgent & Important):
   - Valoare mare pe termen lung, dar nu arde acum.
   - Set: priority='medium' (sau 'low'), importance='high'
   
3. DELEGATE (Urgent & Not Important):
   - Trebuie făcut acum, dar nu necesită neapărat expertiza utilizatorului (sau e doar zgomot).
   - Set: priority='high', importance='low'
   
4. ELIMINATE (Not Urgent & Not Important):
   - Nici urgent, nici important.
   - Set: priority='low', importance='low'

REGULI:
- Dacă deadline-ul este azi/mâine, este URGENT (priority high/critical).
- Dacă titlul sugerează impact major (ex: "proiect", "contract", "sănătate"), este IMPORTANT (importance high).
- Fii decisiv.

Răspunde STRICT JSON:
{
  "updates": [
    { "id": "taskId", "priority": "enum", "importance": "enum", "quadrant": "do|schedule|delegate|eliminate" }
  ],
  "reasoning": "Scurtă justificare globală"
}

Data curentă: ${now}`;

        const tasksDescription = tasks.map((t: any) =>
            `ID: ${t.id} | Titlu: "${t.title}" | Deadline: ${t.deadline || 'Fără'} | Prioritate curentă: ${t.priority}`
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
                    { role: "user", content: `Clasifică aceste taskuri în Matricea Eisenhower:\n\n${tasksDescription}` }
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AI gateway error:", response.status, errorText);
            throw new Error(`AI gateway error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("Nu s-a primit răspuns de la AI");

        let parsed;
        try {
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
            const jsonStr = jsonMatch[1]?.trim() || content.trim();
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse AI response:", content);
            throw new Error("Răspuns invalid de la AI");
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in ai-matrix function:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Eroare necunoscută"
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
