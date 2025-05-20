const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Socket.IO server is running');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.room).emit('receive_message', data);
  });

  socket.on('draw', (data) => {
    socket.to(data.room).emit('receive_drawing_data', data);
  });

  // Add undo event handler
  socket.on('undo_action', ({ room, history }) => {
    socket.to(room).emit('undo_action', { room, history });
  });

  // Add redo event handler
  socket.on('redo_action', ({ room, history }) => {
    socket.to(room).emit('redo_action', { room, history });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
