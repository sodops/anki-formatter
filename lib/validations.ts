/**
 * Zod validation schemas for all API route inputs
 * Centralized validation to prevent injection attacks
 */

import { z } from "zod";

// ─── Shared primitives ─────────────────────────────────────────────

const uuid = z.string().uuid();

// ─── Generate API ───────────────────────────────────────────────────

export const generateSchema = z.object({
  cards: z
    .array(
      z.object({
        question: z.string().min(1).max(5000),
        answer: z.string().min(1).max(5000),
      }),
    )
    .min(1)
    .max(5000),
  deck_name: z.string().max(200).default("Smart Deck"),
});

// ─── Logs API ───────────────────────────────────────────────────────

export const logsSchema = z.object({
  level: z.enum(["INFO", "WARN", "ERROR", "DEBUG", "info", "warn", "error", "debug"]),
  message: z.string().min(1).max(2000),
  data: z.record(z.string(), z.unknown()).default({}),
  user_agent: z.string().max(500).optional(),
});

// ─── Translate API ──────────────────────────────────────────────────

export const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  target: z.enum(["uz", "en", "ru", "ko", "ja", "de", "fr", "es"]).default("uz"),
});

// ─── Analytics (Web Vitals) API ─────────────────────────────────────

export const analyticsSchema = z.object({
  name: z.enum(["CLS", "FCP", "LCP", "TTFB", "INP", "FID"]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  delta: z.number().finite().optional(),
  id: z.string().max(100).optional(),
  navigationType: z.string().max(50).optional(),
});

// ─── Parse API (JSON body variant) ──────────────────────────────────

export const parseJsonSchema = z.object({
  doc_url: z.string().url().optional(),
  raw_text: z.string().max(500000).optional(), // 500KB max text
});

// ─── Sync POST API ─────────────────────────────────────────────────

const changeTypes = z.enum([
  "DECK_CREATE",
  "DECK_UPDATE",
  "DECK_DELETE",
  "CARD_CREATE",
  "CARD_UPDATE",
  "CARD_DELETE",
  "REVIEW_LOG",
]);

const syncChange = z.object({
  type: changeTypes,
  id: z.string().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().optional(),
});

export const syncPostSchema = z.object({
  changes: z.array(syncChange).max(5000).default([]),
  settings: z.record(z.string(), z.unknown()).optional(),
  daily_progress: z.record(z.string(), z.unknown()).optional(),
  lastSyncedAt: z.string().nullable().optional(),
});

// ─── Backup Import API ─────────────────────────────────────────────

const backupDeck = z.object({
  id: uuid,
  name: z.string().min(1).max(500),
  user_id: z.string().optional(), // Will be overwritten server-side
  description: z.string().max(5000).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).default({}),
  is_deleted: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const backupCard = z.object({
  id: uuid,
  deck_id: uuid,
  user_id: z.string().optional(), // Will be overwritten server-side
  term: z.string().min(1).max(10000),
  definition: z.string().max(10000).nullable().optional(),
  tags: z.array(z.string().max(100)).max(50).default([]),
  review_data: z.record(z.string(), z.unknown()).default({}),
  is_suspended: z.boolean().default(false),
  is_deleted: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const backupReviewLog = z.object({
  id: uuid,
  card_id: uuid,
  deck_id: uuid,
  user_id: z.string().optional(),
  grade: z.number().int().min(1).max(4),
  elapsed_time: z.number().int().optional(),
  review_state: z.unknown().optional(),
  created_at: z.string().optional(),
});

export const backupImportSchema = z.object({
  version: z.number().optional(),
  data: z.object({
    decks: z.array(backupDeck).max(1000),
    cards: z.array(backupCard).max(50000),
    review_logs: z.array(backupReviewLog).max(100000).default([]),
    user_data: z
      .object({
        settings: z.record(z.string(), z.unknown()).default({}),
        daily_progress: z.record(z.string(), z.unknown()).default({}),
      })
      .optional()
      .default({ settings: {}, daily_progress: {} }),
  }),
});
