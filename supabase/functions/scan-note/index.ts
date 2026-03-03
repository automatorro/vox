import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, language = "ro" } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an OCR and task extraction assistant. You receive a photo of a handwritten or printed note.

Your job:
1. Extract ALL text from the image using OCR
2. Interpret the text and identify tasks, events, and reminders
3. Return structured data

Rules:
- Detect the language of the note automatically
- For each identified item, determine if it's a task, event, or reminder
- Extract dates, times, priorities if mentioned
- If no specific date/time is found, leave those fields null
- Respond in ${language === "ro" ? "Romanian" : "English"}
- Be thorough - extract EVERYTHING from the note

You MUST call the extract_items function with your findings.`;

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
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` },
              },
              {
                type: "text",
                text: "Please extract all items from this note. Identify tasks, events, and reminders with their details.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_items",
              description: "Extract structured items from the scanned note",
              parameters: {
                type: "object",
                properties: {
                  rawText: {
                    type: "string",
                    description: "The full raw text extracted from the image via OCR",
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["task", "event", "reminder"],
                          description: "The type of item",
                        },
                        title: {
                          type: "string",
                          description: "The title or description of the item",
                        },
                        description: {
                          type: "string",
                          description: "Additional details if any",
                        },
                        date: {
                          type: "string",
                          description: "ISO date string if a date is mentioned, null otherwise",
                        },
                        time: {
                          type: "string",
                          description: "Time in HH:MM format if mentioned, null otherwise",
                        },
                        priority: {
                          type: "string",
                          enum: ["low", "medium", "high", "critical"],
                          description: "Priority level if determinable",
                        },
                        duration: {
                          type: "number",
                          description: "Duration in minutes if mentioned",
                        },
                      },
                      required: ["type", "title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["rawText", "items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_items" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-note error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
