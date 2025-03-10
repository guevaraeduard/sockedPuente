/**
 * Módulo para gestionar el estado global de la aplicación
 */

// Estado global de la aplicación
let state = {
  data_users: [],
  data_lines: [],
  crossing: false,
  intervalActive: false,
  data_off_crossing: [],
  crossing_online: null,
  animationProgress: 0
};

/**
 * Inicializa el estado de la aplicación
 */
function initializeState() {
  state = {
    data_users: [],
    data_lines: [],
    crossing: false,
    intervalActive: false,
    data_off_crossing: [],
    crossing_online: null,
    animationProgress: 0
  };
}

/**
 * Obtiene el estado actual o una propiedad específica
 * @param {string} [property] - Propiedad específica a obtener (opcional)
 * @returns {any} El estado completo o la propiedad solicitada
 */
function getState(property) {
  if (property) {
    return state[property];
  }
  return state;
}

/**
 * Actualiza una propiedad del estado
 * @param {string} property - Propiedad a actualizar
 * @param {any} value - Nuevo valor
 */
function setState(property, value) {
  if (property in state) {
    state[property] = value;
  } else {
    console.warn(`Advertencia: Intentando establecer una propiedad inexistente: ${property}`);
  }
}

module.exports = {
  initializeState,
  getState,
  setState
}; 