// drawing-state.js
// A minimal in-memory op log with pointer-based undo/redo (stack pointer)
class DrawingState {
  constructor() {
    this.ops = []; // array of {seq, op}
    this.seq = 0;
    this.pointer = 0; // number of ops visible (0..ops.length)
    this.pendingStrokes = new Map(); // opId -> {op}
    this.userColors = new Map();
    this.colorPool = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6'];
    this.nextColor = 0;
  }

  assignColor(userId) {
    if (!this.userColors.has(userId)) {
      const c = this.colorPool[this.nextColor % this.colorPool.length];
      this.userColors.set(userId, c);
      this.nextColor++;
    }
    return this.userColors.get(userId);
  }

  beginPendingStroke(opId, userId, meta) {
    this.pendingStrokes.set(opId, {
      opId, userId, kind:'stroke', color: meta.color || '#000',
      width: meta.width || 4, points: []
    });
  }

  appendPointsToPending(opId, userId, points = [], end=false) {
    const p = this.pendingStrokes.get(opId);
    if (!p) {
      // if not found, create fallback
      this.beginPendingStroke(opId, userId, { color:'#000', width:4 });
    }
    const pend = this.pendingStrokes.get(opId);
    pend.points.push(...points);
    if (end) {
      // finish
      return this.finishPendingStroke(opId, userId);
    } else {
      // optionally flush intermediate as partial op? here we wait till end
      return null;
    }
  }

  finishPendingStroke(opId, userId) {
    const op = this.pendingStrokes.get(opId);
    if (!op) return null;
    this.pendingStrokes.delete(opId);
    // create final op with seq to be assigned by pushOp
    return {
      kind: 'stroke',
      opId: op.opId,
      userId: userId,
      color: op.color,
      width: op.width,
      points: op.points.map(p => ({ x: p.x, y: p.y, t: p.t }))
    };
  }

  pushOp(op) {
    const seq = this.seq++;
    const seqOp = { seq, op };
    // If there had been undos (pointer < ops.length), when a new op is pushed we must truncate the redo tail
    if (this.pointer < this.ops.length) {
      this.ops = this.ops.slice(0, this.pointer);
    }
    this.ops.push(seqOp);
    // By default make the new op visible. For control ops (undo/redo) a caller may pass a desired visible pointer
    // (handled by passing the second optional argument 'visiblePointer' to pushOp).
    // To keep the API backwards-compatible, if a caller passed a visible pointer, use it.
    if (arguments.length > 1 && typeof arguments[1] === 'number') {
      this.pointer = arguments[1];
    } else {
      this.pointer = this.ops.length; // new op visible
    }
    return seqOp;
  }

  // Find pointer value that hides the most-recent stroke within the visible prefix
  findPreviousPointer() {
    if (this.pointer <= 0) return 0;
    // look backwards through visible ops to find the last stroke op
    for (let i = this.pointer - 1; i >= 0; i--) {
      const candidate = this.ops[i];
      if (candidate && candidate.op && candidate.op.kind === 'stroke') {
        // to hide this stroke we set pointer to its index (so it's excluded)
        return i;
      }
    }
    return 0;
  }

  // Find pointer value that makes the next stroke visible (redo)
  findNextPointer() {
    // search after current visible prefix
    for (let i = this.pointer; i < this.ops.length; i++) {
      const candidate = this.ops[i];
      if (candidate && candidate.op && candidate.op.kind === 'stroke') {
        // to include this stroke we set pointer to i+1
        return i + 1;
      }
    }
    return this.pointer; // nothing to redo
  }

  getSnapshot() {
    return { ops: this.ops.slice(), pointerSeq: this.pointer };
  }

  applyUndo() {
    // move pointer so the last visible stroke is hidden
    const newPointer = this.findPreviousPointer();
    if (typeof newPointer !== 'number' || newPointer === this.pointer) return null;
    const op = { kind: 'undo', targetPointer: newPointer };
    return this.pushOp(op, newPointer);
  }

  applyRedo() {
    const newPointer = this.findNextPointer();
    if (typeof newPointer !== 'number' || newPointer === this.pointer) return null;
    const op = { kind: 'redo', targetPointer: newPointer };
    return this.pushOp(op, newPointer);
  }

  removeUser(userId) {
    // optional: release color
    // this.userColors.delete(userId);
  }
}

module.exports = DrawingState;
