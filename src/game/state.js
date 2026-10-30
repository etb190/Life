// state.js — creates the core game state object (age, stats, money, job).
// This folder holds the game logic: plain JavaScript only, no React imports.

export function createInitialState() {
  return {
    age: 0,
    alive: true,
    money: 0,
    job: null,
    stats: {
      happiness: 50,
      health: 50,
      smarts: 50,
      looks: 50,
    },
  };
}
