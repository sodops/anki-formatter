import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logsSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    // Rate limit: 60 requests per minute per IP
    const ip = getClientIP(request);
    const rl = await rateLimit(`logs:${ip}`, { limit: 60, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = logsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { level, message, data, user_agent } = parsed.data;

    const user_id = user.id;

    const { error } = await supabase.from("system_logs").insert({
      user_id,
      level,
      message,
      data: data || {},
      user_agent: user_agent || request.headers.get("user-agent"),
    });

    if (error) {
      console.error("Error logging to DB:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logging API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
