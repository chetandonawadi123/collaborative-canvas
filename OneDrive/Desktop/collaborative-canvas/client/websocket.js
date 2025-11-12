// socket.io client with guarded handlers in case canvas module hasn't loaded yet
const socketClient = io();
window.socketClient = socketClient;

// small queues for messages that arrive before canvas exposes handlers
const queuedOps = [];
let queuedState = null;

function flushQueuesIfReady() {
  const hasReplace = typeof window.replaceStateFromServer === 'function';
  const hasApply = typeof window.applyRemoteOp === 'function';
  if (hasReplace && queuedState) {
    console.debug('[ws] flushing queued state');
    try { window.replaceStateFromServer(queuedState); } catch (e) { console.warn(e); }
    queuedState = null;
  }
  if (hasApply && queuedOps.length) {
    console.debug('[ws] flushing', queuedOps.length, 'queued ops');
    while (queuedOps.length) {
      const op = queuedOps.shift();
      try { window.applyRemoteOp(op); } catch (e) { console.warn(e); }
    }
  }
}

// try to flush periodically in case load order is slow
const flushInterval = setInterval(() => {
  flushQueuesIfReady();
  if ((!queuedState) && queuedOps.length === 0) clearInterval(flushInterval);
}, 250);

socketClient.on('connect', () => {
  console.debug('[ws] connected, joining demo');
  socketClient.emit('join', { roomId: 'demo', userName: `User-${Math.floor(Math.random() * 1000)}` });
});

socketClient.on('joined', payload => {
  console.debug('[ws] joined', payload && payload.userId);
  socketClient.userId = payload.userId;
  if (payload.state) {
    if (typeof window.replaceStateFromServer === 'function') {
      window.replaceStateFromServer(payload.state);
    } else {
      queuedState = payload.state;
    }
  }
});

socketClient.on('op', seqOp => {
  if (typeof window.applyRemoteOp === 'function') {
    window.applyRemoteOp(seqOp);
  } else {
    queuedOps.push(seqOp);
  }
});

socketClient.on('sync_state', state => {
  if (typeof window.replaceStateFromServer === 'function') {
    window.replaceStateFromServer(state);
  } else {
    queuedState = state;
  }
});
