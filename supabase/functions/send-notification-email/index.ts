import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  type: "deadline" | "overload" | "conflict";
  items: Array<{
    title: string;
    deadline?: string;
    priority?: string;
  }>;
}

const getEmailContent = (type: string, items: NotificationRequest["items"]) => {
  const itemsList = items
    .map((item) => `<li><strong>${item.title}</strong>${item.deadline ? ` - ${item.deadline}` : ""}${item.priority ? ` (${item.priority})` : ""}</li>`)
    .join("");

  switch (type) {
    case "deadline":
      return {
        subject: "⏰ Vox: Deadline-uri apropiate!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 32px; border-radius: 16px;">
            <h1 style="color: #60a5fa; margin-bottom: 24px;">⏰ Ai deadline-uri apropiate!</h1>
            <p style="color: #9ca3af; margin-bottom: 16px;">Următoarele sarcini au deadline în curând:</p>
            <ul style="background: rgba(96, 165, 250, 0.1); padding: 20px 40px; border-radius: 12px; border-left: 4px solid #60a5fa;">
              ${itemsList}
            </ul>
            <p style="color: #9ca3af; margin-top: 24px;">Nu uita să le finalizezi la timp!</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">— Echipa Vox</p>
          </div>
        `,
      };
    case "overload":
      return {
        subject: "⚠️ Vox: Zi supraîncărcată detectată!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 32px; border-radius: 16px;">
            <h1 style="color: #f59e0b; margin-bottom: 24px;">⚠️ Zi supraîncărcată!</h1>
            <p style="color: #9ca3af; margin-bottom: 16px;">Ai prea multe de făcut într-o singură zi:</p>
            <ul style="background: rgba(245, 158, 11, 0.1); padding: 20px 40px; border-radius: 12px; border-left: 4px solid #f59e0b;">
              ${itemsList}
            </ul>
            <p style="color: #9ca3af; margin-top: 24px;">Consideră reprogramarea unor sarcini pentru a evita stresul.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">— Echipa Vox</p>
          </div>
        `,
      };
    case "conflict":
      return {
        subject: "🔴 Vox: Conflict de programare detectat!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 32px; border-radius: 16px;">
            <h1 style="color: #ef4444; margin-bottom: 24px;">🔴 Conflict de programare!</h1>
            <p style="color: #9ca3af; margin-bottom: 16px;">Următoarele evenimente se suprapun:</p>
            <ul style="background: rgba(239, 68, 68, 0.1); padding: 20px 40px; border-radius: 12px; border-left: 4px solid #ef4444;">
              ${itemsList}
            </ul>
            <p style="color: #9ca3af; margin-top: 24px;">Te rugăm să reprogramezi unul dintre ele.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">— Echipa Vox</p>
          </div>
        `,
      };
    default:
      return {
        subject: "📋 Vox: Notificare",
        html: `<p>Ai o notificare nouă în Vox.</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, items }: NotificationRequest = await req.json();

    if (!email || !type || !items) {
      throw new Error("Missing required fields: email, type, items");
    }

    const { subject, html } = getEmailContent(type, items);

    console.log(`Sending ${type} notification to ${email} for ${items.length} items`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vox <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
