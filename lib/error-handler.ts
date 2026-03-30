/**
 * Centralized error handling and logging system
 * Provides user-friendly error messages and structured logging
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { ZodError } from "zod";

export type ErrorLevel = "error" | "warn" | "info";

export type ErrorCategory = 
  | "validation"      // Input validation failed
  | "auth"            // Authentication/authorization error
  | "database"        // Database operation failed
  | "network"         // Network/external service error
  | "rate_limit"      // Rate limit exceeded
  | "not_found"       // Resource not found
  | "conflict"        // Resource conflict (e.g., duplicate)
  | "server"          // Generic server error
  | "unknown";        // Unknown/unclassified

/**
 * Typed API error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public category: ErrorCategory = "server",
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: this.message,
      ...(env.isDevelopment && {
        debug: {
          category: this.category,
          details: this.details,
          stack: this.stack,
        },
      }),
    };
  }
}

interface ErrorLogEntry {
  level: ErrorLevel;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}

/**
 * Format Zod validation errors into a user-friendly structure
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const message = issue.message;
    
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(message);
  }
  
  return formatted;
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
 * Determine error category from error object
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof ApiError) {
    return error.category;
  }

  const errorStr = String(error);
  const errorMsg = error instanceof Error ? error.message : errorStr;
  const lowerMsg = errorMsg.toLowerCase();

  // Check error patterns
  if (
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("authentication") ||
    lowerMsg.includes("invalid login") ||
    lowerMsg.includes("credentials")
  ) {
    return "auth";
  }

  if (
    lowerMsg.includes("forbidden") ||
    lowerMsg.includes("permission") ||
    lowerMsg.includes("access denied")
  ) {
    return "auth";
  }

  if (
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("too many requests")
  ) {
    return "rate_limit";
  }

  if (
    lowerMsg.includes("duplicate") ||
    lowerMsg.includes("conflict") ||
    lowerMsg.includes("already exists")
  ) {
    return "conflict";
  }

  if (
    lowerMsg.includes("not found") ||
    lowerMsg.includes("no such") ||
    lowerMsg.includes("does not exist")
  ) {
    return "not_found";
  }

  if (
    lowerMsg.includes("database") ||
    lowerMsg.includes("postgres") ||
    lowerMsg.includes("constraint") ||
    lowerMsg.includes("foreign key") ||
    lowerMsg.includes("null value")
  ) {
    return "database";
  }

  if (
    lowerMsg.includes("network") ||
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("connection")
  ) {
    return "network";
  }

  return "unknown";
}

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
  if (env.isDevelopment) {
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
      ...(env.isDevelopment && { 
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
 * Accepts either individual field errors or a ZodError
 */
export function createValidationError(
  fieldOrError: string | ZodError,
  message?: string
): NextResponse {
  let errors: Record<string, string[]>;
  let userMessage = "Validation failed. Please check your input.";

  if (fieldOrError instanceof ZodError) {
    errors = formatZodErrors(fieldOrError);
    userMessage = "Invalid input. Please check the highlighted fields.";
  } else if (typeof fieldOrError === "string" && message) {
    errors = { [fieldOrError]: [message] };
    userMessage = `${fieldOrError}: ${message}`;
  } else {
    errors = {};
  }

  return NextResponse.json(
    {
      error: userMessage,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
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
