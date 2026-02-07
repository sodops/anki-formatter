import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_API_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const flaskResponse = await fetch(`${FLASK_URL}/parse`, {
      method: "POST",
      body: formData,
    });

    if (!flaskResponse.ok) {
      const error = await flaskResponse.json();
      return NextResponse.json(
        { error: error.error || "Failed to parse" },
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
