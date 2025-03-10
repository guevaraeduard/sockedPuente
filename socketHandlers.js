/**
 * Configuración y manejo de eventos de Socket.IO
 */

const { getState, setState } = require("./state");
const { initController, handleJoinLine, checkDataLines } = require("./vehicleController");

let checkInterval = null;

/**
 * Configura los manejadores de eventos para Socket.IO
 * @param {Object} io - Instancia de Socket.IO
 */
function setupSocketHandlers(io) {
  // Inicializar el controlador de vehículos con la instancia de io
  initController(io);

  io.on("connection", (socket) => {
    console.log("Un usuario se ha conectado:", socket.id);

    socket.on("joinLine", ({ id_user, direction, speed, delay, name }) => {
      try {
        const success = handleJoinLine(id_user, direction, speed, delay, name, socket);
        
        if (success) {
          // Inicia el intervalo solo si no está activo
          if (!getState("intervalActive")) {
            setState("intervalActive", true);
            
            // Guardar referencia al intervalo para poder detenerlo si es necesario
            if (!checkInterval) {
              checkInterval = setInterval(() => checkDataLines(), 1000);
            }
          }
        } else {
          socket.emit("error", { message: "No se pudo unir a la línea" });
        }
      } catch (error) {
        console.error("Error en evento joinLine:", error);
        socket.emit("error", { message: "Error al procesar la solicitud" });
      }
    });

    socket.on("leaveLine", ({ id_user }) => {
      try {
        if (!id_user) {
          socket.emit("error", { message: "ID de usuario no proporcionado" });
          return;
        }
        
        // Elimina el usuario de data_users
        const data_users = getState("data_users");
        delete data_users[id_user];
        setState("data_users", data_users);
        
        // Elimina el vehículo de la cola
        const data_lines = getState("data_lines").filter((line) => line.id !== id_user);
        setState("data_lines", data_lines);
        
        socket.leave("vehicle-line");

        io.to("vehicle-line").emit("dataLine", {
          list_vehicles: getState("data_lines"),
          crossing: getState("crossing"),
          animation_crossing: null,
        });
      } catch (error) {
        console.error("Error en evento leaveLine:", error);
        socket.emit("error", { message: "Error al salir de la línea" });
      }
    });

    socket.on("checkExistingUser", ({ id_user }) => {
      try {
        if (!id_user) {
          socket.emit("error", { message: "ID de usuario no proporcionado" });
          return;
        }
        
        let exists = getState("data_lines").some((vehicle) => vehicle.id === id_user);
       
        if (exists) {
          socket.emit("existingUserResponse", exists);
        } else if (getState("crossing_online")) {
          exists = getState("crossing_online").id === id_user;
          socket.emit("existingUserResponse", exists);
        } else {
          socket.emit("existingUserResponse", false);
        }
      } catch (error) {
        console.error("Error en evento checkExistingUser:", error);
        socket.emit("error", { message: "Error al verificar usuario existente" });
      }
    });

    socket.on("rejoinSimulation", (userData) => {
      try {
        // Buscar el vehículo existente
        const data_users = getState("data_users");
        const existingVehicle = data_users[userData.id_user];
       
        if (existingVehicle) {
          // Actualizar el socket ID del vehículo existente
          existingVehicle.id = socket.id;
          socket.join("vehicle-line");
          
          // Enviar los datos actuales al cliente
          socket.emit("dataLine", {
            list_vehicles: getState("data_lines"),
            crossing: getState("crossing"),
            animation_crossing: getState("crossing_online"),
            progress: getState("animationProgress"),
          });
        } else {
          // Si no existe, tratarlo como una nueva conexión
          handleJoinLine(
            userData.id_user, 
            userData.direction, 
            userData.speed, 
            userData.delay, 
            userData.name, 
            socket
          );
        }
      } catch (error) {
        console.error("Error en evento rejoinSimulation:", error);
        socket.emit("error", { message: "Error al reconectar a la simulación" });
      }
    });

    socket.on("forceLeave", ({ id_user }) => {
      try {
        const data_lines = getState("data_lines");
        const vehicleIndex = data_lines.findIndex((v) => v.id === id_user);
        
        if (vehicleIndex !== -1) {
          const oldSocketId = data_lines[vehicleIndex].data.id;

          // Notificar al cliente anterior que su sesión ha sido cerrada
          if (oldSocketId && io.sockets.sockets.get(oldSocketId)) {
            io.to(oldSocketId).emit("duplicateSession");
          }

          // Eliminar el vehículo de la lista
          data_lines.splice(vehicleIndex, 1);
          setState("data_lines", data_lines);

          // Actualizar a todos los clientes
          io.emit("vehicleLine", data_lines);
        }
      } catch (error) {
        console.error("Error en evento forceLeave:", error);
        socket.emit("error", { message: "Error al forzar la salida" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Un usuario se ha desconectado:", socket.id);
    });
  });
}

module.exports = {
  setupSocketHandlers
}; 