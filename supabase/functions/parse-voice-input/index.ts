import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!transcript || transcript.trim() === "") {
      throw new Error("No transcript provided");
    }

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    const systemPrompt = `You are a smart assistant that parses voice commands in Romanian to create tasks, events, or reminders.

Current date: ${today}
Current hour: ${currentHour}

Parse the user's voice input and return a JSON object with the item to create.

Rules:
- Detect if it's a task (something to do), event (something scheduled with duration), or reminder (just a notification at a time)
- Extract the title from the main content
- For tasks: extract deadline (default to today if not specified), priority (low/medium/high/critical based on urgency words like "urgent", "important")
- For events: extract startTime and duration in minutes (default 60 minutes if not specified)
- For reminders: extract the time

Time parsing:
- "mâine" = tomorrow
- "azi" / "astăzi" = today  
- "poimâine" = day after tomorrow
- "dimineață" = 9:00
- "la prânz" = 12:00
- "după-amiază" = 15:00
- "seară" / "diseară" = 19:00
- Explicit times like "la 14:00" or "la ora 3"

Return ONLY valid JSON in this exact format:
{
  "type": "task" | "event" | "reminder",
  "title": "string",
  "deadline": "ISO date string" (only for tasks),
  "priority": "low" | "medium" | "high" | "critical" (only for tasks),
  "startTime": "ISO date string" (only for events),
  "duration": number in minutes (only for events),
  "time": "ISO date string" (only for reminders)
}`;

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
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
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
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsedItem = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ item: parsedItem }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error parsing voice input:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
