const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { initializeState, getState, setState } = require("./state");
const { setCrossing, checkDataLines, handleJoinLine } = require("./vehicleController");
const { setupSocketHandlers } = require("./socketHandlers");

// Inicializar la aplicación Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Inicializar el estado de la aplicación
initializeState();

// Configurar los manejadores de Socket.IO
setupSocketHandlers(io);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
