/**
 * Centralized error handling and logging system
 * Provides user-friendly error messages and structured logging
 */

import { NextResponse } from "next/server";

export type ErrorLevel = "error" | "warn" | "info";

interface ErrorLogEntry {
  level: ErrorLevel;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}

/**
 * Maps common error patterns to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  "Invalid login credentials": "Incorrect email or password. Please try again.",
  "User already registered": "This email is already registered. Please log in.",
  "Email not confirmed": "Email not confirmed. Please check your inbox.",
  "Password is too short": "Password must be at least 6 characters long.",
  "Invalid email": "Invalid email format.",
  
  // Database errors
  "duplicate key value": "This data already exists.",
  "foreign key constraint": "Related data not found.",
  "null value": "Required field is missing.",
  "syntax error": "Data format error.",
  
  // Network errors
  "Failed to fetch": "Network connection error. Please check your internet.",
  "NetworkError": "Network error. Please try again.",
  "timeout": "Request timed out. Please try again.",
  
  // Rate limiting
  "Too many requests": "Too many requests sent. Please wait a moment.",
  "Rate limit exceeded": "Rate limit exceeded. Please try again later.",
  
  // Permission errors
  "Unauthorized": "Authentication required. Please log in.",
  "Forbidden": "You don't have permission to perform this action.",
  "Access denied": "Access denied. Please contact an administrator.",
  
  // Validation errors
  "Invalid input": "Invalid data format.",
  "Required field": "This field is required.",
  "Invalid format": "Invalid format. Please follow the example.",
  
  // Generic fallbacks
  "Internal server error": "A server error occurred. Please try again later.",
  "Something went wrong": "An unexpected error occurred. Please try again.",
};

/**
 * Get user-friendly error message in Uzbek
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (!error) return "An unknown error occurred.";
  
  const errorStr = String(error);
  const errorMsg = error instanceof Error ? error.message : errorStr;
  
  // Check for known error patterns
  for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMsg.toLowerCase().includes(pattern.toLowerCase())) {
      return message;
    }
  }
  
  // Check for Supabase auth errors
  if (errorMsg.includes("AuthApiError") || errorMsg.includes("AuthError")) {
    return "Authentication error. Please log in again.";
  }
  
  // Check for Postgres errors
  if (errorMsg.includes("PostgrestError") || errorMsg.includes("23")) {
    return "Database error. Please try again.";
  }
  
  // Return sanitized original message (avoid exposing internal details)
  if (errorMsg.length < 100) {
    return errorMsg;
  }
  
  return "An error occurred. Please try again.";
}

/**
 * Log error to console and external service (if configured)
 */
export async function logError(entry: Omit<ErrorLogEntry, "timestamp">): Promise<void> {
  const logEntry: ErrorLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    stack: entry.error instanceof Error ? entry.error.stack : undefined,
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error(`[${logEntry.level.toUpperCase()}]`, logEntry.message, {
      error: logEntry.error,
      context: logEntry.context,
      stack: logEntry.stack,
    });
  }
  
  // In production, log to external service (e.g., Sentry)
  // TODO: Add Sentry integration
  // if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  //   Sentry.captureException(logEntry.error || new Error(logEntry.message), {
  //     level: logEntry.level,
  //     contexts: { custom: logEntry.context },
  //   });
  // }
  
  // Also log to database for admin panel
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: logEntry.level.toUpperCase(),
        message: logEntry.message,
        data: {
          error: String(logEntry.error),
          context: logEntry.context,
          stack: logEntry.stack,
        },
      }),
    });
  } catch {
    // Silently fail if logging fails (avoid infinite loops)
  }
}

/**
 * Create standardized error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  status: number = 500,
  context?: Record<string, unknown>
): NextResponse {
  const message = getUserFriendlyMessage(error);
  
  // Log error
  logError({
    level: "error",
    message: `API Error: ${message}`,
    error,
    context,
  });
  
  return NextResponse.json(
    { 
      error: message,
      ...(process.env.NODE_ENV === "development" && { 
        debug: error instanceof Error ? error.message : String(error) 
      })
    },
    { status }
  );
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandler<T>(
  handler: (_request: Request) => Promise<T>
): (request: Request) => Promise<T | NextResponse> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      return createErrorResponse(error, 500, {
        url: request.url,
        method: request.method,
      });
    }
  };
}

/**
 * Validation error helper
 */
export function createValidationError(field: string, message: string): NextResponse {
  return NextResponse.json(
    { 
      error: `${field}: ${message}`,
      field,
    },
    { status: 400 }
  );
}

/**
 * Rate limit error helper
 */
export function createRateLimitError(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: `Too many requests. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.` },
    { 
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/**
 * Auth error helper
 */
export function createAuthError(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || "Authentication required. Please log in." },
    { status: 401 }
  );
}

/**
 * Permission error helper
 */
export function createPermissionError(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || "You don't have permission to perform this action." },
    { status: 403 }
  );
}
