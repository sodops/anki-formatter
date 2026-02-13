import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { level, message, data, user_agent } = body;

    if (!message || !level) {
      return NextResponse.json({ error: "Missing level or message" }, { status: 400 });
    }

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
