import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExistingItem {
  id: string;
  type: string;
  title: string;
  time: string;
  priority?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface RequestBody {
  transcript: string;
  language?: string;
  existingItems?: ExistingItem[];
  categories?: Category[];
  todayItemCount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { transcript, language, existingItems = [], categories = [], todayItemCount = 0 } = body;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!transcript || transcript.trim() === "") {
      throw new Error("No transcript provided");
    }

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // Build context string for existing items
    let existingContext = "";
    if (existingItems.length > 0) {
      existingContext = `\n\nExisting items for today (${existingItems.length} total):
${existingItems.map(item => `- ${item.type}: "${item.title}" at ${new Date(item.time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}${item.priority ? ` (${item.priority})` : ''}`).join('\n')}`;
    }

    // Build categories context
    let categoriesContext = "";
    if (categories.length > 0) {
      categoriesContext = `\n\nAvailable categories:
${categories.map(cat => `- "${cat.name}" (id: ${cat.id})`).join('\n')}`;
    }

    const isRomanian = language === 'ro-RO' || !language;

    const systemPrompt = `You are an intelligent personal assistant that parses voice commands to manage a calendar/todo app.
You understand both Romanian and English, responding based on the detected language.

Current date: ${today}
Current hour: ${currentHour}
Language detected: ${isRomanian ? 'Romanian' : 'English'}
${existingContext}
${categoriesContext}
Today's item count: ${todayItemCount}

Parse the user's voice input and analyze the context to provide smart suggestions.

INTENT DETECTION:
- "create": Adding new items (adaugă, creează, am, vreau, pune, add, create, schedule)
- "modify": Changing existing items (mută, schimbă, modifică, change, move, update)
- "delete": Removing items (șterge, anulează, remove, delete, cancel)
- "query": Asking questions (ce am, când, cât, what do I have, when)

ITEM PARSING RULES:
- Detect type: task (something to do), event (scheduled with duration), reminder (notification)
- Extract title from main content
- For tasks: deadline (default today if not specified), priority based on urgency words
- For events: startTime and duration (default 60 min)
- For reminders: notification time

TIME PARSING (Romanian):
- "mâine" = tomorrow, "azi"/"astăzi" = today, "poimâine" = day after tomorrow
- "dimineață" = 9:00, "la prânz" = 12:00, "după-amiază" = 15:00, "seară"/"diseară" = 19:00
- Explicit: "la 14:00", "ora 3"

PRIORITY DETECTION:
- "urgent", "foarte important", "critical", "ASAP" → "critical"
- "important" → "high"
- "când apuc", "dacă am timp", "if I have time" → "low"
- Default → "medium"

CATEGORY MATCHING:
If the content clearly matches an existing category, include the categoryId.

WARNINGS TO GENERATE:
1. If todayItemCount >= 6: Add overload warning
2. If new event overlaps with existing item times: Add conflict warning
3. If deadline is in the past: Add deadline warning
4. If priority seems mismatched with urgency: Add suggestion

SUGGESTIONS TO GENERATE:
- If overloaded: Suggest rescheduling to tomorrow
- If no category matched but one seems appropriate: Suggest category
- If duration seems too short/long for the task: Suggest adjustment

CONFIDENCE SCORING:
- 0.9-1.0: Clear, unambiguous command
- 0.7-0.9: Some inference needed
- 0.5-0.7: Significant assumptions made
- <0.5: Very unclear, definitely needs confirmation

Return ONLY valid JSON:
{
  "intent": "create" | "modify" | "delete" | "query",
  "item": {
    "type": "task" | "event" | "reminder",
    "title": "string",
    "deadline": "ISO date" (tasks only),
    "priority": "low" | "medium" | "high" | "critical" (tasks only),
    "startTime": "ISO date" (events only),
    "duration": number in minutes (events only),
    "time": "ISO date" (reminders only),
    "categoryId": "string or null"
  },
  "warnings": [
    {
      "type": "conflict" | "overload" | "deadline" | "suggestion",
      "message": "string in ${isRomanian ? 'Romanian' : 'English'}",
      "severity": "info" | "warning" | "error"
    }
  ],
  "suggestions": [
    {
      "action": "reschedule" | "priority" | "category" | "duration",
      "message": "string in ${isRomanian ? 'Romanian' : 'English'}",
      "suggestedValue": "optional string"
    }
  ],
  "confidence": 0.0-1.0,
  "requiresConfirmation": true/false (true if confidence < 0.8 or has warnings)
}`;

    console.log("Processing voice input:", transcript);
    console.log("Context - existing items:", existingItems.length, "categories:", categories.length);

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

    console.log("AI response:", content);

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsedResult = JSON.parse(jsonStr);

    // Ensure we have the expected structure
    const result = {
      intent: parsedResult.intent || 'create',
      item: parsedResult.item || parsedResult,
      warnings: parsedResult.warnings || [],
      suggestions: parsedResult.suggestions || [],
      confidence: parsedResult.confidence || 0.9,
      requiresConfirmation: parsedResult.requiresConfirmation ?? (parsedResult.confidence < 0.8 || (parsedResult.warnings?.length > 0)),
    };

    console.log("Parsed result:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
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
