// state.js — creates the core game state object (age, stats, money, job).
// This folder holds the game logic: plain JavaScript only, no React imports.

export function createInitialState(appearance = null) {
  return {
    age: 0,
    alive: true,
    money: 0,
    job: null,
    appearance: appearance || {
      gender: 'male',
      hair: 0,
      brow: 0,
      skinTone: 2,
      hairColor: 0,
      eyeColor: 0,
      facialHair: -1,
      stage: 'Young_Adult',
    },
    stats: {
      happiness: 50,
      health: 50,
      smarts: 50,
      looks: 50,
    },
  };
}
