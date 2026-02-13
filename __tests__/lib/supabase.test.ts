/**
 * Supabase Server Client Tests
 */

import { createClient } from "@/lib/supabase/server";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      getAll: jest.fn(() => []),
      setAll: jest.fn(),
      set: jest.fn(),
    })
  ),
}));

// Mock Supabase SSR
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe("Supabase Server Client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("should create a client successfully", async () => {
    const client = await createClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it("should throw error if environment variables are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(createClient()).rejects.toThrow(
      "Supabase environment variables are not configured"
    );
  });

  it("should be able to call auth methods", async () => {
    const client = await createClient();

    const result = await client.auth.getUser();

    expect(result.data).toBeDefined();
    expect(result.data.user).toHaveProperty("id");
    expect(result.data.user).toHaveProperty("email");
  });
});
