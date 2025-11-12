// Wire up UI, canvas and websocket
(function(){
  const canvasEl = document.getElementById('canvas');
  const joinBtn = document.getElementById('join');
  const clearBtn = document.getElementById('clear');
  const roomInput = document.getElementById('room');

  const canvas = window.collabCanvas.createCanvas(canvasEl);
  canvas.resize();
  canvas.wire();
  window.addEventListener('resize', ()=>canvas.resize());

  let currentRoom = 'default';

  function connectToRoom(room){
    currentRoom = room || 'default';
    window.ws = window.collabWS.connect(currentRoom);
    window.collabWS.onMessage(handleMessage);
  }

  function handleMessage(msg){
    if(!msg || !msg.type) return;
    if(msg.type === 'init'){
      // full state
      canvas.clear();
      if(msg.state && Array.isArray(msg.state.strokes)){
        msg.state.strokes.forEach(s=>canvas.applyStroke(s));
      }
    } else if(msg.type === 'draw'){
      canvas.applyStroke(msg.stroke);
    } else if(msg.type === 'clear'){
      canvas.clear();
    }
  }

  // local drawing capture: on mouseup, send stroke
  // The canvas module does not currently expose hooks for per-move events; use interval polling of endStroke
  let lastStrokeId = 0;
  setInterval(()=>{
    const stroke = canvas.endStroke && canvas.endStroke();
    if(stroke){
      // send stroke to server
      window.collabWS.send('draw',{room:currentRoom, stroke});
    }
  }, 100);

  joinBtn.addEventListener('click', ()=>{
    const room = roomInput.value.trim() || 'default';
    connectToRoom(room);
    // ask server to send full state
    setTimeout(()=>window.collabWS.send('request_full_state',{room}), 200);
  });

  clearBtn.addEventListener('click', ()=>{
    window.collabWS.send('clear',{room:currentRoom});
    canvas.clear();
  });

  // auto-join default on load
  connectToRoom('default');
  setTimeout(()=>window.collabWS.send('request_full_state',{room:'default'}), 200);
})();
