const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Permitir conexiones desde cualquier origen
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

const users = {};

io.on('connection', (socket) => {
  console.log(`🔌 Usuario conectado: ${socket.id}`);

  socket.on('room:join', (room, username, callback) => {
    Object.keys(socket.rooms).forEach(r => {
      if (r !== socket.id) { 
        socket.leave(r);
      }
    });

    socket.join(room);
    users[socket.id] = { username: username || 'Anónimo', room: room };
    
    console.log(`🚪 ${username || 'Anónimo'} se ha unido a la sala: ${room}`);
    
    socket.to(room).emit('chat:message', {
        user: 'Sistema', 
        text: `${username || 'Anónimo'} se ha unido.`,
        timestamp: new Date().toLocaleTimeString()
    });
    if (callback) {
      callback(`Te has unido a la sala: ${room}`);
    }
  });

  socket.on('room:leave', (room) => {
    if (socket.rooms.has(room)) {
        socket.leave(room);
        const user = users[socket.id] ? users[socket.id].username : 'Un usuario';
        
        console.log(`🚪 ${user} ha abandonado la sala: ${room}`);
        
        socket.to(room).emit('chat:message', {
            user: 'Sistema', 
            text: `${user} ha abandonado.`,
            timestamp: new Date().toLocaleTimeString()
        });

        if (users[socket.id]) delete users[socket.id];
    }
  });

  socket.on('chat:message', (data, callback) => {
    const userInfo = users[socket.id] || { username: 'Anónimo', room: 'general' };
    const { room, username } = userInfo;
    
    const messageData = {
        user: username,
        text: data.message,
        timestamp: new Date().toLocaleTimeString()
    };

    console.log(`✉️ [${room}] ${username}: ${data.message}`);

   io.to(room).emit('chat:message', messageData);

    if (callback) {
        callback({ status: 'ok', message: 'Mensaje entregado' });
    }
  });

  socket.on('chat:typing', (isTyping) => {
    const userInfo = users[socket.id] || { username: 'Anónimo', room: 'general' };
    const { room, username } = userInfo;

    socket.to(room).emit('chat:typing', {
      user: username,
      isTyping: isTyping
    });
  });

  socket.on('disconnect', () => {
    const userInfo = users[socket.id];
    if (userInfo) {
      const { username, room } = userInfo;
      console.log(`❌ Usuario desconectado: ${socket.id} de sala: ${room}`);
      
      socket.to(room).emit('chat:message', {
        user: 'Sistema', 
        text: `${username} se ha desconectado.`,
        timestamp: new Date().toLocaleTimeString()
      });
      delete users[socket.id];
    } else {
      console.log(`❌ Usuario desconectado: ${socket.id}`);
    }
  });
});
server.listen(PORT, () => {
  console.log(`🚀 Servidor Express y Socket.IO escuchando en http://localhost:${PORT}`);
});