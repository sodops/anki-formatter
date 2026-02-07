import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_API_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const flaskResponse = await fetch(`${FLASK_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!flaskResponse.ok) {
      const error = await flaskResponse.json();
      return NextResponse.json(
        { error: error.error || "Failed to generate deck" },
        { status: flaskResponse.status }
      );
    }

    const data = await flaskResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
