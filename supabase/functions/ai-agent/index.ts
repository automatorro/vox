import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Use service role for DB access
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { transcript, language, timezoneOffset = 0 } = await req.json();
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

        // Calculate user's local date based on their timezone offset
        const serverNow = new Date();
        const userLocalTime = new Date(serverNow.getTime() - (timezoneOffset * 60 * 1000));
        const today = userLocalTime.toISOString().split('T')[0];
        
        // Calculate tomorrow in user's timezone
        const tomorrowDate = new Date(userLocalTime);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        // 2. Define Tools accessible to the AI
        const toolsDefinition = `
You have access to the following TOOLS. If you need to use a tool, respond with valid JSON in the format: { "tool": "tool_name", "args": { ... } }

1. check_availability(startDate: string, endDate: string)
   - Checks calendar for events between dates. 
   - Use ISO format YYYY-MM-DD.
   - Example: { "tool": "check_availability", "args": { "startDate": "2024-02-10", "endDate": "2024-02-12" } }

2. create_item(type: "task"|"event", title: string, date: string, time?: string, duration?: number)
   - Creates a new item.
   - Example: { "tool": "create_item", "args": { "type": "event", "title": "Meeting", "date": "2024-02-10", "time": "14:00" } }

3. project_breakdown(description: string, deadline: string)
   - Generates a list of subtasks for a complex project.
   - Example: { "tool": "project_breakdown", "args": { "description": "Launch Website", "deadline": "2024-05-01" } }

If you have enough information to answer the user directly (or after tool use), respond with the final JSON:
{
  "intent": "response",
  "conversationalResponse": "Your natural language reply here",
  "data": ... (optional context)
}
`;

        // 3. First LLM Call - Planning
        const systemPrompt = `You are VOX, an intelligent productivity assistant.
Current Date: ${today}
Tomorrow's Date: ${tomorrow}
User's Timezone Offset: ${timezoneOffset} minutes from UTC
Language: ${language || 'RO'}

CRITICAL DATE HANDLING RULES:
- "azi" or "today" = ${today}
- "mâine" or "tomorrow" = ${tomorrow}
- When user says "tomorrow" or "mâine", ALWAYS use ${tomorrow} as the date
- For reminders, use the full ISO datetime format: YYYY-MM-DDTHH:mm:ss

${toolsDefinition}

OUTPUT SCHEMA (Result):
Your final response MUST be valid JSON matching this structure:
{
  "intent": "create" | "modify" | "delete" | "query" | "plan",
  "item": { ...item fields... },
  "conversationalResponse": "Natural language reply",
  "warnings": [],
  "suggestions": []
}

User Input: "${transcript}"

Decide the next best step. Do you need to use a TOOL?
- YES: Respond with { "tool": "name", "args": ... }
- NO (or after tool use): Respond with the Final Output JSON.
`;

        // Helper to call LLM
        const callLLM = async (messages: any[]) => {
            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: messages,
                    temperature: 0.1
                }),
            });
            const data = await response.json();
            return data.choices?.[0]?.message?.content;
        };

        let chatHistory = [{ role: "system", content: systemPrompt }];
        let aiResponse = await callLLM(chatHistory);

        // Clean response
        let parsed;
        try {
            const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiResponse];
            parsed = JSON.parse(jsonMatch[1]?.trim() || aiResponse.trim());
        } catch (e) {
            console.error("Failed to parse initial LLM response", aiResponse);
            // Fallback or retry logic could go here
            return new Response(JSON.stringify({ error: "Failed to parse AI intent" }), { headers: corsHeaders });
        }

        // 4. Tool Execution Loop (Single Turn for now)
        if (parsed.tool) {
            console.log("Executing Tool:", parsed.tool);
            let toolResult = "";

            if (parsed.tool === "check_availability") {
                const { startDate, endDate } = parsed.args;
                const { data: events } = await supabase
                    .from('items')
                    .select('title, start_time, duration')
                    .eq('type', 'event')
                    .gte('start_time', startDate)
                    .lte('start_time', endDate);

                toolResult = `Events found: ${JSON.stringify(events)}`;
            }
            else if (parsed.tool === "project_breakdown") {
                // Logic for project breakdown would go here (or we ask LLM to do it in next step)
                toolResult = "Please generate 5 detailed subtasks for this project in the final response.";
            }

            // 5. Final LLM Call with Tool Data
            chatHistory.push({ role: "assistant", content: JSON.stringify(parsed) });
            chatHistory.push({ role: "system", content: `Tool Output: ${toolResult}\n\nNow provide the final response to the user.` });

            const finalResponse = await callLLM(chatHistory);

            // Parse final response to ensure it matches the expected frontend format
            try {
                const finalMatch = finalResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, finalResponse];
                const finalJson = JSON.parse(finalMatch[1]?.trim() || finalResponse.trim());
                return new Response(JSON.stringify(finalJson), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ conversationalResponse: finalResponse }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // If no tool was needed
        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in ai-agent:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
