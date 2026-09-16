import type { CategoryMinutes, Score } from "@nexora/shared";

// Rule engine lands in building block 03 (docs/ARCHITECTURE.md "Score v0.5").
export function computeScore(_minutes: CategoryMinutes): Score {
  throw new Error("computeScore: building block 03 not implemented yet");
}
