# Collaborative Canvas

## Quick start
1. `cd collaborative-canvas`
2. `npm install`
3. `npm start` (script runs `node server/server.js`)
4. Open multiple browser windows at `http://localhost:3000` to test real-time drawing.

## What’s included
- `client/` — HTML/CSS/JS client (vanilla)
- `server/` — Node + Socket.io server and drawing-state manager
- `ARCHITECTURE.md` — design decisions and data flow (see repo root)

## How to test with multiple users
- Open `http://localhost:3000` in several tabs or different devices on the same network.
- Draw in one window — strokes should appear in others in real-time.
- Click Undo/Redo to test global undo/redo.

## Known limitations
- No persistence: server state is in-memory and lost on restart.
- Cursor indicator UI is not fully implemented.
- Simple redraw strategy (re-renders from op-log for control ops) — can be optimized using layers/offscreen canvases.
- No authentication — user IDs are socket IDs.

## Time spent
Estimated: X hours (replace with your time).
