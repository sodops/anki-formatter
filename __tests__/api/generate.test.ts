/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST as generateHandler } from "@/app/api/generate/route";
import { rateLimit } from "@/lib/rate-limit";

// Mock rate limiter
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(),
  getClientIP: jest.fn(() => "127.0.0.1"),
}));

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
    },
  })),
}));

describe("API: /api/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60000 });
  });

  it("should return 429 when rate limit exceeded", async () => {
    (rateLimit as jest.Mock).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 });

    const request = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({ cards: [] }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await generateHandler(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain("Too many requests");
  });

  it("should return 400 when cards data is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await generateHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No cards data provided");
  });

  it("should generate TSV content successfully", async () => {
    const cards = [
      { question: "What is 2+2?", answer: "4" },
      { question: "Capital of France?", answer: "Paris" },
    ];

    const request = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({ cards, deck_name: "Math Deck" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await generateHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.format).toBe("tsv");
    expect(data.content).toContain("What is 2+2?\t4");
    expect(data.content).toContain("Capital of France?\tParis");
    expect(data.deckName).toBe("Math Deck");
    expect(data.totalCards).toBe(2);
  });
});
