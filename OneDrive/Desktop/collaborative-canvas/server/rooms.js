// Simple room management for WebSocket connections
const rooms = new Map(); // roomId -> Set(ws)
const clientRoom = new Map(); // ws -> roomId

function addClient(ws, roomId){
  if(!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(ws);
  clientRoom.set(ws, roomId);
}

function removeClient(ws){
  const room = clientRoom.get(ws);
  if(!room) return;
  const set = rooms.get(room);
  if(set) set.delete(ws);
  clientRoom.delete(ws);
  // cleanup empty room
  if(set && set.size===0) rooms.delete(room);
}

function broadcast(roomId, data, exceptWs){
  const set = rooms.get(roomId);
  if(!set) return;
  const payload = JSON.stringify(data);
  for(const c of set){
    if(c.readyState === c.OPEN && c !== exceptWs) c.send(payload);
  }
}

module.exports = { addClient, removeClient, broadcast };
