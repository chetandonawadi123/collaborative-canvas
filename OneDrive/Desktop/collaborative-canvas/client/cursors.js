(() => {
  const cursorLayer = document.getElementById('cursor-layer');
  const cursors = {};

  socketClient.on('cursor', ({ userId, x, y, color }) => {
    if (!cursors[userId]) {
      const el = document.createElement('div');
      el.className = 'cursor';
      el.style.background = color || '#555';
      el.innerText = `👤 ${userId.slice(0, 4)}`;
      cursorLayer.appendChild(el);
      cursors[userId] = el;
    }
    const el = cursors[userId];
    el.style.left = `${x * 100}%`;
    el.style.top = `${y * 100}%`;
  });

  socketClient.on('user_count', count => {
    document.getElementById('usersOnline').innerText = `Users: ${count}`;
  });
})();
