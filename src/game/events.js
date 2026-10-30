// events.js — picks random life events and applies their effects to the game state.
// Event content lives in src/data/events.json.
// This folder holds the game logic: plain JavaScript only, no React imports.

// Temporary helper so the module is valid; real event logic comes later.
export function pickRandomEvent(events) {
  if (!events || events.length === 0) return null;
  return events[Math.floor(Math.random() * events.length)];
}
