// save.js — saves and loads the game state (uses the browser's localStorage).
// This folder holds the game logic: plain JavaScript only, no React imports.

// Temporary helpers so the module is valid; real save logic comes later.
const SAVE_KEY = 'life-sim-save';

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}
