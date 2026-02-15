/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST as logsHandler } from "@/app/api/logs/route";
import { rateLimit } from "@/lib/rate-limit";

// Mock rate limiter
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(),
  getClientIP: jest.fn(() => "127.0.0.1"),
}));

// Mock Supabase
const mockInsert = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  })),
}));

describe("API: /api/logs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 });
    mockInsert.mockResolvedValue({ error: null });
  });

  it("should return 429 when rate limit exceeded", async () => {
    (rateLimit as jest.Mock).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 });

    const request = new NextRequest("http://localhost:3000/api/logs", {
      method: "POST",
      body: JSON.stringify({ level: "info", message: "test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await logsHandler(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests");
  });

  it("should return 400 when level or message is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/logs", {
      method: "POST",
      body: JSON.stringify({ level: "info" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await logsHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing level or message");
  });

  it("should log successfully", async () => {
    const request = new NextRequest("http://localhost:3000/api/logs", {
      method: "POST",
      body: JSON.stringify({
        level: "info",
        message: "Test log",
        data: { key: "value" },
      }),
      headers: { "Content-Type": "application/json", "user-agent": "test-agent" },
    });

    const response = await logsHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "test-user-id",
      level: "info",
      message: "Test log",
      data: { key: "value" },
      user_agent: "test-agent",
    });
  });
});
