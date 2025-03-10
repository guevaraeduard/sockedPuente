/**
 * Controlador para la gestión de vehículos y cruces
 */

const { getState, setState } = require("./state");

let io; // Referencia a la instancia de Socket.IO

/**
 * Inicializa el controlador con la instancia de Socket.IO
 * @param {Object} socketIO - Instancia de Socket.IO
 */
function initController(socketIO) {
  io = socketIO;
}

/**
 * Gestiona el cruce de un vehículo
 * @param {Object} data_vehicle - Datos del vehículo que va a cruzar
 */
function setCrossing(data_vehicle) {
  try {
    if (!data_vehicle || !data_vehicle.data) {
      console.error("Error: Datos de vehículo inválidos en setCrossing");
      return;
    }

    setState("crossing", true);
    setState("crossing_online", data_vehicle);
    setState("animationProgress", 0);

    const data_lines = getState("data_lines");
    if (data_lines.length > 0) {
      data_lines.shift();
      setState("data_lines", data_lines);
    } else {
      console.warn("Advertencia: Intentando eliminar de una cola vacía");
    }

    // Crear un intervalo para actualizar el progreso
    const progressInterval = setInterval(() => {
      try {
        let animationProgress = getState("animationProgress");
        animationProgress += (100 / (data_vehicle.time * 1000)) * 100;
        setState("animationProgress", animationProgress);

        // Emitir el progreso actualizado
        io.to("vehicle-line").emit("crossingEvent", {
          list_vehicles: getState("data_lines"),
          crossing: data_vehicle,
          progress: Math.min(100, Number(animationProgress.toFixed(2))),
        });

        // Si llegamos al 100%, limpiamos el intervalo
        if (animationProgress >= 100) {
          clearInterval(progressInterval);
        }
      } catch (error) {
        console.error("Error en el intervalo de progreso:", error);
        clearInterval(progressInterval);
      }
    }, 100);

    setTimeout(() => {
      try {
        setState("crossing", false);
        clearInterval(progressInterval);
        setState("animationProgress", 0);

        data_vehicle.data.direction =
          data_vehicle.data.direction == "Derecha" ? "Izquierda" : "Derecha";
        io.to("vehicle-line").emit("UpdateDirection", {
          direction: data_vehicle.data.direction,
          id: data_vehicle.id,
        });
        
        setTimeout(() => {
          try {
            const data_users = getState("data_users");
            if (data_users[data_vehicle.id]) {
              const data_lines = getState("data_lines");
              data_lines.push(data_vehicle);
              setState("data_lines", data_lines);
              
              io.to("vehicle-line").emit("dataLine", {
                list_vehicles: getState("data_lines"),
                crossing: true,
                animation_crossing: null,
              });
            }
          } catch (error) {
            console.error("Error al reinsertar vehículo en la cola:", error);
          }
        }, data_vehicle.data.delay * 1000);

        if (getState("data_lines").length === 0) {
          io.to("vehicle-line").emit("UpdateState");
        }
      } catch (error) {
        console.error("Error al finalizar el cruce:", error);
        setState("crossing", false);
        setState("animationProgress", 0);
      }
    }, data_vehicle.time * 1000);
  } catch (error) {
    console.error("Error en setCrossing:", error);
    setState("crossing", false);
    setState("animationProgress", 0);
  }
}

/**
 * Verifica la cola de vehículos y gestiona el siguiente cruce
 */
function checkDataLines() {
  try {
    const data_lines = getState("data_lines");
    const crossing = getState("crossing");
    
    if (data_lines.length > 0 && !crossing) {
      setCrossing(data_lines[0]);
      
    } else if (data_lines.length === 0 && !crossing) {
      io.to("vehicle-line").emit("updateCrossing", false);
    }
  } catch (error) {
    console.error("Error en checkDataLines:", error);
  }
}

/**
 * Añade un vehículo a la cola
 * @param {string} id_user - ID del usuario
 * @param {string} direction - Dirección del vehículo
 * @param {number} speed - Velocidad del vehículo
 * @param {number} delay - Tiempo de espera después de cruzar
 * @param {string} name - Nombre del usuario
 * @param {Object} socket - Socket del cliente
 * @returns {boolean} - Éxito de la operación
 */
function handleJoinLine(id_user, direction, speed, delay, name, socket) {
  try {
    if (!id_user || !socket) {
      console.error("Error: Datos de usuario o socket inválidos");
      return false;
    }

    const data_users = getState("data_users");
    data_users[id_user] = {
      id: socket.id,
      name: name || "Usuario sin nombre",
      direction: direction || "Derecha",
      speed: speed || 50,
      delay: delay || 5,
    };
    setState("data_users", data_users);

    let time = (0.1 / speed) * 3600;
    let line = {
      id: id_user,
      data: data_users[id_user],
      time: time,
    };

    const data_lines = getState("data_lines");
    let exist = data_lines.find((line) => line.id === id_user);
    if (!exist) {
      data_lines.push(line);
      setState("data_lines", data_lines);
    }

    socket.join("vehicle-line");
    io.to("vehicle-line").emit("dataLine", {
      list_vehicles: getState("data_lines"),
      crossing: getState("crossing"),
      animation_crossing: getState("crossing_online"),
      progress: getState("animationProgress"),
    });
    
    return true;
  } catch (error) {
    console.error("Error en handleJoinLine:", error);
    return false;
  }
}

module.exports = {
  initController,
  setCrossing,
  checkDataLines,
  handleJoinLine
}; 