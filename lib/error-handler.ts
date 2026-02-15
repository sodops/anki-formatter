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
  "Invalid login credentials": "Email yoki parol noto'g'ri. Iltimos, qaytadan urinib ko'ring.",
  "User already registered": "Bu email allaqachon ro'yxatdan o'tgan. Login qiling.",
  "Email not confirmed": "Email tasdiqlanmagan. Pochta qutingizni tekshiring.",
  "Password is too short": "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
  "Invalid email": "Email manzil noto'g'ri formatda.",
  
  // Database errors
  "duplicate key value": "Bu ma'lumot allaqachon mavjud.",
  "foreign key constraint": "Bog'liq ma'lumot topilmadi.",
  "null value": "Majburiy maydon to'ldirilmagan.",
  "syntax error": "Ma'lumotlar formatida xatolik.",
  
  // Network errors
  "Failed to fetch": "Internetga ulanishda xatolik. Tarmoqni tekshiring.",
  "NetworkError": "Tarmoq xatosi. Iltimos, qaytadan urinib ko'ring.",
  "timeout": "So'rov vaqti tugadi. Qaytadan urinib ko'ring.",
  
  // Rate limiting
  "Too many requests": "Haddan tashqari ko'p so'rov yuborildi. Biroz kutib turing.",
  "Rate limit exceeded": "Limitdan o'tdingiz. Iltimos, keyinroq urinib ko'ring.",
  
  // Permission errors
  "Unauthorized": "Tizimga kirish talab qilinadi. Login qiling.",
  "Forbidden": "Sizda bu amalni bajarish uchun ruxsat yo'q.",
  "Access denied": "Kirish rad etildi. Admindan ruxsat so'rang.",
  
  // Validation errors
  "Invalid input": "Kiritilgan ma'lumotlar noto'g'ri formatda.",
  "Required field": "Bu maydon to'ldirilishi shart.",
  "Invalid format": "Noto'g'ri format. Namunadagi kabi kiriting.",
  
  // Generic fallbacks
  "Internal server error": "Server xatosi yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.",
  "Something went wrong": "Kutilmagan xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
};

/**
 * Get user-friendly error message in Uzbek
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (!error) return "Noma'lum xatolik yuz berdi.";
  
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
    return "Autentifikatsiya xatosi. Iltimos, qaytadan login qiling.";
  }
  
  // Check for Postgres errors
  if (errorMsg.includes("PostgrestError") || errorMsg.includes("23")) {
    return "Ma'lumotlar bazasi xatosi. Iltimos, qaytadan urinib ko'ring.";
  }
  
  // Return sanitized original message (avoid exposing internal details)
  if (errorMsg.length < 100) {
    return errorMsg;
  }
  
  return "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.";
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
    { error: `Haddan tashqari ko'p so'rov. ${Math.ceil(retryAfterSeconds / 60)} daqiqadan keyin urinib ko'ring.` },
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
    { error: message || "Tizimga kirish talab qilinadi. Login qiling." },
    { status: 401 }
  );
}

/**
 * Permission error helper
 */
export function createPermissionError(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || "Sizda bu amalni bajarish uchun ruxsat yo'q." },
    { status: 403 }
  );
}
