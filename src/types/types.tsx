// ============================================
// UTILITY TYPES - Aliases, unions, mapped types
// ============================================

import type { PlayerScore } from "../interfaces/interfaces";

// Type alias for result mapping
export type Result = Record<string, string>;

// Extended PlayerScore with submission ID for React keys
export type ScoreWithId = PlayerScore & { submissionId: number };

// Future utility types can go here
// Example: export type CouponStatus = "active" | "expired" | "pending";
