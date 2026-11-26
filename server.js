const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const players = new Map();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, players: players.size }));

io.on('connection', (socket) => {
  socket.emit('world:players', [...players.values()]);
  socket.on('player:join', (profile) => {
    const safe = {
      id: socket.id,
      name: String(profile?.name || 'لاعب').slice(0, 18),
      avatar: {
        body: String(profile?.body || 'girl'),
        skin: String(profile?.skin || '#e8b995'),
        hair: String(profile?.hair || '#39271f'),
        clothes: String(profile?.clothes || '#e99cbe'),
        style: String(profile?.style || 'long')
      },
      x: 0, y: 0, z: 5, rotation: 0
    };
    players.set(socket.id, safe);
    socket.emit('player:ready', safe);
    socket.broadcast.emit('player:joined', safe);
    io.emit('world:count', players.size);
  });
  socket.on('player:move', (move) => {
    const p = players.get(socket.id);
    if (!p || !move) return;
    p.x = Number(move.x) || 0; p.z = Number(move.z) || 0;
    p.rotation = Number(move.rotation) || 0;
    socket.broadcast.emit('player:moved', { id: socket.id, x: p.x, z: p.z, rotation: p.rotation });
  });
  socket.on('disconnect', () => {
    if (players.delete(socket.id)) {
      io.emit('player:left', socket.id);
      io.emit('world:count', players.size);
    }
  });
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Virtual World server listening on ${port}`));
