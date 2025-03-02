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
let data_lines = [];
//si esta cruzando
let crossing = false;
let intervalActive = false; // Variable para rastrear si el intervalo está activo
let data_off_crossing = [];
let crossing_online = null;
let animationProgress = 0; // Nueva variable para el progreso

// Función que convierte crossing en true y emite un evento
function setCrossing(data_vehicle) {
  crossing = true;
  crossing_online = data_vehicle;
  animationProgress = 0; // Reiniciamos el progreso

  data_lines.shift();

  // Crear un intervalo para actualizar el progreso
  const progressInterval = setInterval(() => {
    animationProgress += (100 / (data_vehicle.time * 1000)) * 100; // Incremento cada 100ms

    // Emitir el progreso actualizado
    io.to("vehicle-line").emit("crossingEvent", {
      list_vehicles: data_lines,
      crossing: data_vehicle,
      progress: Math.min(100, Number(animationProgress.toFixed(2))), // Aseguramos que no pase del 100%
    });

    // Si llegamos al 100%, limpiamos el intervalo
    if (animationProgress >= 100) {
      clearInterval(progressInterval);
    }
  }, 100); // Actualizamos cada 100ms para un movimiento más suave

  setTimeout(() => {
    crossing = false;
    clearInterval(progressInterval); // Aseguramos que el intervalo se limpie
    animationProgress = 0;

    //Aqui agregar el vehiculo a la lista de vehiculos que salieron del cruce
    //Despues accedr a cuantos segundos tiene que esperar para volver a ingresar a la cola

    data_vehicle.data.direction =
      data_vehicle.data.direction == "Derecha" ? "Izquierda" : "Derecha";
    io.to("vehicle-line").emit("UpdateDirection", {
      direction: data_vehicle.data.direction,
      id: data_vehicle.id,
    });
    setTimeout(() => {
      if (data_users[data_vehicle.id]) {
        data_lines.push(data_vehicle);
        console.log("Vehículo agregado de nuevo a data_lines:", data_vehicle);
        // Emitir evento para actualizar la lista de vehículos
        io.to("vehicle-line").emit("dataLine", {
          list_vehicles: data_lines,
          crossing: true,
          animation_crossing: null,
        });
      }
    }, data_vehicle.data.delay * 1000);

    if (data_lines.length == 0) {
      io.to("vehicle-line").emit("UpdateState");
    }
  }, data_vehicle.time * 1000);
}

// Función que se ejecuta continuamente
const checkDataLines = () => {
  if (data_lines.length > 0 && !crossing) {
    // Llama a la función para establecer crossing en true
    setCrossing(data_lines[0]);
    console.log("Primer dato eliminado, nuevo data_lines:", data_lines);
  } else if (data_lines.length == 0 && !crossing) {
    io.to("vehicle-line").emit("updateCrossing", false);
  }
};

io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado:", socket.id);

  socket.on("joinLine", ({ id_user, direction, speed, delay, name }) => {
    data_users[id_user] = {
      id: socket.id,
      name: name,
      direction: direction,
      speed: speed,
      delay: delay,
    };

    let time = (0.1 / speed) * 3600;
    let line = {
      id: id_user,
      data: data_users[id_user],
      time: time,
    };

    let exist = data_lines.find((line) => line.id === id_user);
    if (!exist) {
      data_lines.push(line);
    }

    socket.join("vehicle-line");
    //Emite a todos los usuarios que estan en la Sala
    io.to("vehicle-line").emit("dataLine", {
      list_vehicles: data_lines,
      crossing: crossing,
      animation_crossing: crossing_online,
      progress: animationProgress
    });
    //Emite a todos los usuarios que estan en la Sala menos al mismo
    // socket.to("vehicle-line").emit("newVehicle", 'El usuario '+ name + ' se ha unido a la cola del puente')

    // Inicia el intervalo solo si no está activo
    if (!intervalActive) {
      intervalActive = true; // Marca el intervalo como activo
      setInterval(() => checkDataLines(), 1000); // Ejecuta cada 1000 ms (1 segundo)
    }
  });

  socket.on("leaveLine", ({ id_user }) => {
    // Elimina el usuario de data_users
    delete data_users[id_user];
    // Modifica el contenido de data_lines en lugar de reasignarlo
    data_lines = data_lines.filter((line) => line.id !== id_user);
    socket.leave("vehicle-line");

    io.to("vehicle-line").emit("dataLine", {
      list_vehicles: data_lines,
      crossing: crossing,
      animation_crossing: null,
    });
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Servidor escuchando en el puerto 300 0");
});
