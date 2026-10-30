# Life Sim

A text-based life simulation game for PC (BitLife-style: stats, age-up button, random events, choices shown as buttons).

Built with **Vite + React (JavaScript)**, styled with **Tailwind CSS v4**, and wrapped as a desktop app with **Electron**.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer (LTS recommended)
- npm (included with Node.js)

## Running the game

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Run in the browser
npm run dev
#    -> open the URL it prints (default: http://localhost:5173)

# 3. Run in an Electron window (dev mode)
#    Keep `npm run dev` running, then open a SECOND terminal and run:
npm run electron

# 4. Build for production (web files only)
npm run build
#    -> output goes to dist/
```

## Folder structure

```
life-sim/
├── index.html            # Vite's entry page (loads src/main.jsx)
├── vite.config.js        # Vite config: React plugin + Tailwind CSS v4 plugin
├── package.json          # Scripts: dev / electron / build
├── electron/
│   └── main.js           # Electron main process (opens the game window)
└── src/
    ├── main.jsx          # React entry point (imports ./ui/styles.css)
    ├── data/             # Game content as plain JSON — no code here
    │   ├── events.json   # Random life events (empty for now)
    │   ├── jobs.json     # Jobs/careers (empty for now)
    │   └── items.json    # Items you can buy (empty for now)
    ├── game/             # Game logic — plain JavaScript, NEVER imports React
    │   ├── state.js      # Creates the core game state (age, stats, money…)
    │   ├── events.js     # Random events
    │   ├── aging.js      # Age-up logic
    │   └── save.js       # Save/load (localStorage)
    └── ui/               # React components + styling
        ├── App.jsx       # Root component (placeholder screen for now)
        ├── styles.css    # Only contains: @import "tailwindcss";
        └── components/   # Empty for now: reusable UI components go here
```

## Conventions (important for future changes)

- **Styling:** 100% Tailwind utility classes (Tailwind CSS v4 via the official `@tailwindcss/vite` plugin). No other CSS libraries or UI kits.
- **Separation:** all game logic lives in `src/game/` as plain JavaScript — those files must never import React. UI components live in `src/ui/`.
- **Content:** events, jobs and items are plain JSON files in `src/data/`, so new content can be added without touching code.
