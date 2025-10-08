const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {}; // { name: { users: Set(), messages: [] } }
const users = {}; // { username: socket.id }

app.get("/", (_, res) => res.sendFile(path.join(__dirname, "index.html")));

io.on("connection", (socket) => {
  socket.on("join room", ({ username, room }) => {
    if (!username || !room) return;

    // Save user data
    socket.data.username = username;
    socket.data.room = room;
    users[username] = socket.id;

    // Create room if missing
    if (!rooms[room]) rooms[room] = { users: new Set(), messages: [] };
    rooms[room].users.add(username);
    socket.join(room);

    // Send chat history
    socket.emit("chat history", rooms[room].messages);

    // Notify everyone
    io.to(room).emit("room message", {
      message: `${username} joined the room.`,
    });
    io.to(room).emit("user list", Array.from(rooms[room].users));
  });

  socket.on("change room", (newRoom) => {
    const oldRoom = socket.data.room;
    const username = socket.data.username;
    if (!username || !newRoom) return;

    // Leave old room
    if (oldRoom && rooms[oldRoom]) {
      rooms[oldRoom].users.delete(username);
      socket.leave(oldRoom);
      io.to(oldRoom).emit("room message", {
        message: `${username} left the room.`,
      });
      io.to(oldRoom).emit("user list", Array.from(rooms[oldRoom].users));
    }

    // Join new room
    socket.data.room = newRoom;
    if (!rooms[newRoom]) rooms[newRoom] = { users: new Set(), messages: [] };
    rooms[newRoom].users.add(username);
    socket.join(newRoom);

    // Sync user state
    socket.emit("chat history", rooms[newRoom].messages);
    io.to(newRoom).emit("room message", {
      message: `${username} joined the room.`,
    });
    io.to(newRoom).emit("user list", Array.from(rooms[newRoom].users));
  });

  socket.on("chat message", ({ username, room, message }) => {
    if (!rooms[room] || !message) return;
    const msg = { username, message, timestamp: Date.now() };
    rooms[room].messages.push(msg);
    io.to(room).emit("chat message", msg);
  });

  socket.on("private message", ({ from, to, message }) => {
    const id = users[to];
    if (id) {
      io.to(id).emit("private message", { from, message });
    } else {
      socket.emit("room message", { message: `User '${to}' not found.` });
    }
  });

  socket.on("disconnect", () => {
    const { username, room } = socket.data;
    if (username && room && rooms[room]) {
      rooms[room].users.delete(username);
      io.to(room).emit("room message", {
        message: `${username} disconnected.`,
      });
      io.to(room).emit("user list", Array.from(rooms[room].users));
    }
    delete users[username];
  });
});

server.listen(3000, () => console.log("Server ready → http://localhost:3000"));
