# ARCHITECTURE.md

## Overview
This app is a real-time collaborative drawing canvas using Socket.io. The server maintains an authoritative operation log; clients send batched strokes and re-render according to the authoritative order.

## Data Flow Diagram
(Describe and include a simple diagram in your submission)
- Client draws → collects points → emits `stroke_chunk` to server.
- Server receives points → assembles stroke → assigns seq and appends to op-log → broadcasts `op`.
- Clients receive `op` → append to local op list → render up to pointer.

## WebSocket Protocol
- Client → Server:
  - `join`, `stroke_start`, `stroke_chunk`, `stroke_end`, `cursor`, `undo`, `redo`, `request_sync`
- Server → Client:
  - `joined`, `op`, `sync_state`, `cursor`

All messages are JSON.

## Undo/Redo Strategy
- Pointer-based global history:
  - Server keeps `ops` and a `pointer` pointing to number of visible ops.
  - `undo` decrements pointer; `redo` increments pointer.
  - Changes to the pointer are broadcast as `op` entries (`kind: undo/redo`) so all clients re-render consistently.

## Conflict Resolution
- Server assigns authoritative sequence numbers.
- Clients optimistically render local strokes, but server ordering is final. If ordering differs, server `op` messages correct clients (client re-renders).

## Performance Decisions
- Normalize coordinates (0..1) to allow different resolution clients.
- Batch points (`stroke_chunk`) with a throttle to limit messages.
- Use incremental draw for final strokes; control ops trigger full re-render.

## Scalability
- Current design is single-process in-memory. For many rooms or users, persist op-log to DB and use a message broker (Redis) + multiple socket servers (Socket.io adapter) for horizontal scaling.

