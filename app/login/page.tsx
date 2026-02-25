"use client";

import { useState, useTransition } from "react";
import { login, signup, resetPassword } from "./actions";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type AuthMode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">("student");

  // OAuth handler still needs client-side SDK because it redirects the browser
  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OAuth failed";
      setError(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    if (mode === "signup") {
      formData.set("role", selectedRole);
    }

    startTransition(async () => {
      let result;

      if (mode === "signin") {
        result = await login(formData);
      } else if (mode === "signup") {
        result = await signup(formData);
      } else if (mode === "forgot") {
        result = await resetPassword(formData);
      }

      if (result?.error) {
        setError(result.error);
      } else if (result && "success" in result && result.success) {
        setMessage(result.success);
        // If signin was successful, the server action would have redirected already.
        // If we are here, it's likely signup or forgot password success.
      }
    });
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-orb login-orb-1"></div>
      <div className="login-orb login-orb-2"></div>
      <div className="login-orb login-orb-3"></div>

      <Link href="/" className="login-back-home">
        ← Home
      </Link>

      <div className="login-wrapper">
        {/* Left — Hero */}
        <div className="login-hero">
          <div className="login-hero-content">
            <div className="login-brand-mark">⚡</div>
            <h1>AnkiFlow</h1>
            <p className="login-hero-tagline">
              {mode === "signin"
                ? "Smart flashcard platform"
                : mode === "signup"
                  ? "Join thousands of learners today"
                  : "Recover your account"}
            </p>
            <div className="login-hero-features">
              <div className="login-hero-feature">
                <span className="login-hero-feature-icon">🔄</span>
                <div>
                  <strong>Cloud Sync</strong>
                  <span>Sync across all your devices</span>
                </div>
              </div>
              <div className="login-hero-feature">
                <span className="login-hero-feature-icon">📊</span>
                <div>
                  <strong>Statistics</strong>
                  <span>Track your progress in real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Auth Form */}
        <div className="login-form-side">
          <div className={`login-card ${mode === "signup" ? "border-signup" : ""}`}>
            <div className="login-card-header">
              <h2 className={mode === "signup" ? "text-signup" : ""}>
                {mode === "signin"
                  ? "Welcome Back!"
                  : mode === "signup"
                    ? "Create Account"
                    : "Reset Password"}
              </h2>
              <p>
                {mode === "signin"
                  ? "Sign in to continue to AnkiFlow"
                  : mode === "signup"
                    ? "Get started for free"
                    : "Enter your email to receive a reset link"}
              </p>
            </div>

            {/* OAuth (Only show for Signin/Signup) */}
            {mode !== "forgot" && (
              <>
                <div className="login-oauth">
                  <button
                    className="login-oauth-btn"
                    onClick={() => handleOAuth("google")}
                    disabled={isPending}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    className="login-oauth-btn"
                    onClick={() => handleOAuth("github")}
                    disabled={isPending}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </button>
                </div>
                <div className="login-divider">
                  <span>or</span>
                </div>
              </>
            )}

            {/* Role Selector (Only for Signup) */}
            {mode === "signup" && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>I am a</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '10px',
                      border: `2px solid ${selectedRole === 'student' ? '#7C5CFC' : 'var(--border)'}`,
                      background: selectedRole === 'student' ? 'rgba(124,92,252,0.08)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column' as const,
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>🎓</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Student</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Learn & study</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '10px',
                      border: `2px solid ${selectedRole === 'teacher' ? '#10B981' : 'var(--border)'}`,
                      background: selectedRole === 'teacher' ? 'rgba(16,185,129,0.08)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column' as const,
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>👨‍🏫</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Teacher</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Create & assign</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  autoComplete="email"
                  disabled={isPending}
                />
              </div>

              {mode !== "forgot" && (
                <div className="login-field">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <label htmlFor="password">Password</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setError(null);
                          setMessage(null);
                        }}
                        className="login-forgot-link"
                        style={{
                          fontSize: "12px",
                          color: "var(--text-tertiary)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    disabled={isPending}
                  />
                </div>
              )}

              {error && <div className="login-alert login-alert-error">{error}</div>}
              {message && <div className="login-alert login-alert-success">{message}</div>}

              <button
                type="submit"
                className={`login-submit-btn ${mode === "signup" ? "btn-signup" : ""}`}
                disabled={isPending}
              >
                {isPending ? (
                  <span className="login-btn-loading">
                    <span className="login-spinner-sm"></span>
                    Loading...
                  </span>
                ) : mode === "signin" ? (
                  "Sign In"
                ) : mode === "signup" ? (
                  "Sign Up"
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            {/* Toggle */}
            <div className="login-mode-toggle">
              {mode === "signin" ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Sign Up
                  </button>
                </span>
              ) : (
                <span>
                  {mode === "forgot" ? "Remember your password? " : "Already have an account? "}
                  <button
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
