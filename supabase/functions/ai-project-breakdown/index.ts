import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectGoal, targetDeadline, availableHoursPerDay = 4, language = 'RO' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!projectGoal) {
      throw new Error("Project goal is required");
    }

    const today = new Date().toISOString().split('T')[0];
    const deadline = targetDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const systemPrompt = `You are an expert project manager and productivity coach. Your task is to break down a large project goal into actionable milestones and subtasks.

RULES:
1. Create 3-6 milestones (major phases)
2. Each milestone has 2-5 subtasks
3. Assign realistic durations (in minutes) based on typical complexity
4. Calculate realistic deadlines spread across available time
5. Consider dependencies - earlier tasks should be scheduled first
6. User has approximately ${availableHoursPerDay} productive hours per day
7. Today's date is ${today}, final deadline is ${deadline}
8. Respond in ${language === 'RO' ? 'Romanian' : 'English'}

OUTPUT FORMAT (JSON only, no markdown):
{
  "projectTitle": "Concise project title",
  "milestones": [
    {
      "title": "Milestone name",
      "description": "Brief description",
      "deadline": "YYYY-MM-DD",
      "order": 1,
      "subtasks": [
        {
          "title": "Subtask name",
          "duration": 60,
          "priority": "high" | "medium" | "low",
          "deadline": "YYYY-MM-DD",
          "order": 1
        }
      ]
    }
  ],
  "totalEstimatedHours": number,
  "confidence": 0.0-1.0,
  "tips": ["Productivity tip 1", "Tip 2"]
}`;

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
          { role: "user", content: `Break down this project: "${projectGoal}"` }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    // Parse the AI response
    let breakdown;
    try {
      // Handle markdown code blocks
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiContent];
      breakdown = JSON.parse(jsonMatch[1]?.trim() || aiContent.trim());
    } catch (e) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse project breakdown");
    }

    return new Response(JSON.stringify(breakdown), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in ai-project-breakdown:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
