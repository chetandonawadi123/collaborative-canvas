const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/../client'));
const rooms = new Map();

io.on('connection', socket => {
  socket.on('join', ({ roomId, userName }) => {
    socket.join(roomId);
    socket.data.userId = socket.id;
    socket.data.roomId = roomId || 'demo';
    if (!rooms.has(roomId)) rooms.set(roomId, new DrawingState());
    const state = rooms.get(roomId);
    const userColor = state.assignColor(socket.id);
    socket.emit('joined', { roomId, userId: socket.id, userColor, state: state.getSnapshot() });
    io.to(roomId).emit('user_count', io.sockets.adapter.rooms.get(roomId)?.size || 1);
  });
  // Use the room associated with this socket (fallback to 'demo')
  socket.on('stroke_start', msg => {
    const r = socket.data.roomId || 'demo';
    const state = rooms.get(r);
    if (!state) return;
    state.beginPendingStroke(msg.opId, socket.id, msg.meta);
  });

  socket.on('stroke_chunk', msg => {
    const r = socket.data.roomId || 'demo';
    const state = rooms.get(r);
    if (!state) return;
    const op = state.appendPointsToPending(msg.opId, socket.id, msg.points, msg.end);
    if (op) io.to(r).emit('op', state.pushOp(op));
  });

  socket.on('stroke_end', ({ opId }) => {
    const r = socket.data.roomId || 'demo';
    const state = rooms.get(r);
    if (!state) return;
    const op = state.finishPendingStroke(opId, socket.id);
    if (op) io.to(r).emit('op', state.pushOp(op));
  });

  socket.on('undo', () => {
    const r = socket.data.roomId || 'demo';
    const state = rooms.get(r);
    if (!state) return;
    const seqOp = state.applyUndo();
    if (seqOp) io.to(r).emit('op', seqOp);
  });

  socket.on('redo', () => {
    const r = socket.data.roomId || 'demo';
    const state = rooms.get(r);
    if (!state) return;
    const seqOp = state.applyRedo();
    if (seqOp) io.to(r).emit('op', seqOp);
  });

  socket.on('cursor', c => {
    const r = socket.data.roomId || 'demo';
    const state = rooms.get(r);
    const color = state && state.userColors ? state.userColors.get(socket.id) : '#000';
    io.to(r).emit('cursor', { userId: socket.id, ...c, color });
  });
});

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

function startServer(port, attemptsLeft = 3) {
  server.listen(port, () => console.log(`🚀 Collaborative Canvas running at http://localhost:${port}`));
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      server.removeAllListeners('error');
      startServer(port + 1, attemptsLeft - 1);
      return;
    }
    console.error('Server error:', err);
    process.exit(1);
  });
}

startServer(DEFAULT_PORT);
