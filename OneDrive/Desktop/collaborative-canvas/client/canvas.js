(() => {
  // Single, clean canvas module. This file must end with a single IIFE close.
  console.debug('[canvas] loaded');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const colorPicker = document.getElementById('colorPicker');
  const widthRange = document.getElementById('widthRange');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  // display size in CSS pixels
  let displayW = 0, displayH = 0;

  // stored ops from server
  let ops = [];
  let renderPointer = 0;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    displayW = rect.width || window.innerWidth;
    displayH = rect.height || Math.max(window.innerHeight - 90, 200);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  window.addEventListener('resize', resizeCanvas);
  // initial size
  resizeCanvas();

  function drawSegment(p1, p2, color, widthPx) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    ctx.beginPath();
    ctx.moveTo(p1.x * displayW, p1.y * displayH);
    ctx.lineTo(p2.x * displayW, p2.y * displayH);
    ctx.stroke();
  }

  function drawFullStroke(stroke) {
    if (!stroke || !stroke.points || stroke.points.length < 1) return;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke.color || '#000';
    ctx.lineWidth = stroke.width || 2;
    ctx.beginPath();
    const pts = stroke.points;
    ctx.moveTo(pts[0].x * displayW, pts[0].y * displayH);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * displayW, pts[i].y * displayH);
    ctx.stroke();
  }

  function redraw() {
    ctx.clearRect(0, 0, displayW, displayH);
    for (let i = 0; i < renderPointer && i < ops.length; i++) {
      const op = ops[i].op;
      if (op.kind === 'stroke') drawFullStroke(op);
    }
  }

  function applyOp(seqOp) {
    if (!seqOp) return;
    const op = seqOp.op;
    ops.push(seqOp);
    // undo/redo are control ops that set the visible pointer
    if (op.kind === 'undo' || op.kind === 'redo') {
      if (typeof op.targetPointer === 'number') {
        renderPointer = op.targetPointer;
      } else {
        // fallback: clamp
        renderPointer = Math.max(0, Math.min(ops.length, renderPointer));
      }
      redraw();
      return;
    }

    // normal op (stroke etc.)
    renderPointer = Math.min(renderPointer + 1, ops.length);
    if (op.kind === 'stroke') drawFullStroke(op);
  }

  window.applyRemoteOp = applyOp;
  window.replaceStateFromServer = (state) => {
    ops = state.ops || [];
    renderPointer = state.pointerSeq || ops.length;
    redraw();
  };

  function normalizePointerEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  // local drawing state
  let isDrawing = false;
  let currentPoints = [];
  let currentOpId = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerId != null && canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    isDrawing = true;
    currentPoints = [normalizePointerEvent(e)];
    currentOpId = `${(window.socketClient && window.socketClient.userId) || 'anon'}-${Date.now()}`;
    if (window.socketClient && window.socketClient.emit) {
      window.socketClient.emit('stroke_start', { opId: currentOpId, meta: { color: colorPicker.value, width: +widthRange.value } });
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const pos = normalizePointerEvent(e);
    if (!isDrawing) {
      if (window.socketClient && window.socketClient.emit) window.socketClient.emit('cursor', { x: pos.x, y: pos.y });
      return;
    }
    const prev = currentPoints[currentPoints.length - 1];
    currentPoints.push(pos);
    drawSegment(prev, pos, colorPicker.value, +widthRange.value);
    if (window.socketClient && window.socketClient.emit) window.socketClient.emit('stroke_chunk', { opId: currentOpId, points: [pos] });
  });

  canvas.addEventListener('pointerup', (e) => {
    try { if (e.pointerId != null && canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!isDrawing) return;
    isDrawing = false;
    if (window.socketClient && window.socketClient.emit) window.socketClient.emit('stroke_end', { opId: currentOpId });
    const localOp = { kind: 'stroke', opId: currentOpId, userId: (window.socketClient && window.socketClient.userId), color: colorPicker.value, width: +widthRange.value, points: currentPoints.slice() };
    applyOp({ seq: Date.now(), op: localOp });
  });

  undoBtn.addEventListener('click', () => { if (window.socketClient && window.socketClient.emit) window.socketClient.emit('undo'); });
  redoBtn.addEventListener('click', () => { if (window.socketClient && window.socketClient.emit) window.socketClient.emit('redo'); });

})();