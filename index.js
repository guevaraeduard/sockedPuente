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
/**
 *  Data del usuario 
 * data_users[1545] = {
 *  name: "Juan",
 *  direction: "Perez",
 *  speed: 100,
 *  delay: 100,
 * }
 * */ 
//Data del usuario 
const data_users = [];
//Data de las lineas
const data_lines = [];

io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado:", socket.id);
  
  socket.on("joinLine", ({ id_user, direction, speed, delay, name }) => {
    console.log(id_user, direction, speed, delay, name)
    data_users[id_user] = {
      id: socket.id,
      name: name,
      direction: direction,
      speed: speed,
      delay: delay,
    };


    let time = (0.1/speed) * 3600


    let line = {
      id: id_user,
      data: data_users[id_user],
      time: time,
    }

    let exist = data_lines.find((line) => line.id === id_user)
    if(!exist){
      data_lines.push(line);
    }

    socket.join('vehicle-line')
    //Emite a todos los usuarios que estan en la Sala
    io.to('vehicle-line').emit('dataLine', data_lines)
    //Emite a todos los usuarios que estan en la Sala menos al mismo
   // socket.to("vehicle-line").emit("newVehicle", 'El usuario '+ name + ' se ha unido a la cola del puente')

  });

  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Servidor escuchando en el puerto 300 0");
});
