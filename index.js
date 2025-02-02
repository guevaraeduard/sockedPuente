const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Cambia esto al origen de tu cliente
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado:", socket.id);
  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado:", socket.id);
 });
});

server.listen(3000, () => {
  console.log("Servidor escuchando en el puerto 3000");
});
