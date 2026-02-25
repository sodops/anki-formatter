"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function JoinGroupContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";

  const [status, setStatus] = useState<"idle" | "joining" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [manualCode, setManualCode] = useState(code);

  useEffect(() => {
    if (code && user && !authLoading) {
      joinGroup(code);
    }
  }, [code, user, authLoading]);

  const joinGroup = async (joinCode: string) => {
    if (!joinCode.trim()) return;
    setStatus("joining");
    setMessage("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_code: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join group");
      setStatus("success");
      setGroupName(data.group?.name || "the group");
      setMessage(`You've successfully joined "${data.group?.name || "the group"}"!`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Something went wrong");
    }
  };

  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      joinGroup(manualCode.trim());
    }
  };

  if (authLoading) {
    return (
      <div className="join-page">
        <div className="join-card">
          <div className="join-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="join-page">
        <div className="join-card">
          <div className="join-icon">🔒</div>
          <h1>Sign in to Join</h1>
          <p>You need to be signed in to join a study group.</p>
          <Link href={`/login?redirect=/join?code=${encodeURIComponent(code)}`} className="join-btn join-btn-primary">
            Sign In
          </Link>
          <Link href="/" className="join-link">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-card">
        {status === "idle" && (
          <>
            <div className="join-icon">👥</div>
            <h1>Join a Study Group</h1>
            <p>Enter the invite code or use a join link from your teacher.</p>
            <form onSubmit={handleManualJoin} className="join-form">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="join-input"
                maxLength={10}
                autoFocus
              />
              <button type="submit" className="join-btn join-btn-primary" disabled={!manualCode.trim()}>
                Join Group
              </button>
            </form>
            <Link href="/student" className="join-link">← Back to Dashboard</Link>
          </>
        )}

        {status === "joining" && (
          <>
            <div className="join-spinner"></div>
            <h1>Joining Group...</h1>
            <p>Please wait while we add you to the group.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="join-icon join-success-icon">✅</div>
            <h1>You&apos;re In!</h1>
            <p>{message}</p>
            <div className="join-actions">
              <Link href="/student" className="join-btn join-btn-primary">
                Go to Dashboard
              </Link>
              <button onClick={() => router.push("/student?tab=groups")} className="join-btn join-btn-outline">
                View My Groups
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="join-icon join-error-icon">❌</div>
            <h1>Couldn&apos;t Join</h1>
            <p className="join-error-msg">{message}</p>
            <div className="join-actions">
              <button onClick={() => { setStatus("idle"); setMessage(""); }} className="join-btn join-btn-primary">
                Try Again
              </button>
              <Link href="/student" className="join-btn join-btn-outline">
                Back to Dashboard
              </Link>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .join-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f0f14;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .join-card {
          background: #16161e;
          border: 1px solid rgba(124, 92, 252, 0.15);
          border-radius: 20px;
          padding: 48px 40px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .join-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .join-success-icon { color: #10B981; }
        .join-error-icon { color: #EF4444; }
        .join-card h1 {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 8px;
        }
        .join-card p {
          color: #9ca3af;
          font-size: 15px;
          margin: 0 0 24px;
          line-height: 1.5;
        }
        .join-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .join-input {
          background: #1a1a26;
          border: 1px solid #2a2a3a;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 18px;
          color: #f1f5f9;
          text-align: center;
          letter-spacing: 3px;
          font-weight: 600;
          outline: none;
          transition: border-color 0.2s;
        }
        .join-input:focus {
          border-color: #7C5CFC;
        }
        .join-input::placeholder {
          letter-spacing: normal;
          font-weight: 400;
          font-size: 15px;
          color: #6b7280;
        }
        .join-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          text-decoration: none;
          transition: all 0.2s;
          font-family: inherit;
        }
        .join-btn-primary {
          background: #7C5CFC;
          color: #fff;
        }
        .join-btn-primary:hover {
          background: #6B4EE6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124, 92, 252, 0.3);
        }
        .join-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .join-btn-outline {
          background: transparent;
          color: #9ca3af;
          border: 1px solid #2a2a3a;
        }
        .join-btn-outline:hover {
          border-color: #7C5CFC;
          color: #7C5CFC;
        }
        .join-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .join-link {
          display: block;
          margin-top: 20px;
          color: #7C5CFC;
          font-size: 14px;
          text-decoration: none;
          font-weight: 500;
        }
        .join-link:hover {
          color: #9B7FFF;
        }
        .join-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #2a2a3a;
          border-top-color: #7C5CFC;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        .join-error-msg {
          color: #f87171 !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .join-card {
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  );
}

export default function JoinGroupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f14', color: '#9ca3af' }}>
        Loading...
      </div>
    }>
      <JoinGroupContent />
    </Suspense>
  );
}