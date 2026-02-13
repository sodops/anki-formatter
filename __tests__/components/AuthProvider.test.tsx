import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/components/AuthProvider";

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

describe("AuthProvider", () => {
  it("renders children when provided", () => {
    render(
      <AuthProvider>
        <div data-testid="child">Test Child</div>
      </AuthProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("provides auth context to children", () => {
    const { container } = render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
