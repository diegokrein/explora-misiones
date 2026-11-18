const targetName = document.querySelector("#targetName");
const scoreValue = document.querySelector("#score");
const remainingValue = document.querySelector("#remaining");
const attemptsValue = document.querySelector("#attempts");
const resetButton = document.querySelector("#resetButton");
const toast = document.querySelector("#toast");

const colors = {
  base: "#2f8f6a",
  hover: "#4cb384",
  correct: "#1d7a55",
  wrong: "#c84232",
  completed: "#d99b27",
  border: "#173f32"
};

let map;
let departmentLayer;
let departments = [];
let remaining = [];
let current = null;
let score = 0;
let attempts = 0;
let toastTimer;
const mode = document.querySelector("#mode");
const hint = document.querySelector("#hint");
const answers = document.querySelector("#answers");
const seats = {
  "25 de Mayo": "Alba Posse",
  "Apóstoles": "Apóstoles",
  "Cainguás": "Campo Grande",
  "Candelaria": "Santa Ana",
  "Capital": "Posadas",
  "Concepción": "Concepción de la Sierra",
  "Eldorado": "Eldorado",
  "General Manuel Belgrano": "Bernardo de Irigoyen",
  "Guaraní": "El Soberbio",
  "Iguazú": "Puerto Esperanza",
  "Leandro N. Alem": "Leandro N. Alem",
  "Libertador General San Martín": "Puerto Rico",
  "Montecarlo": "Montecarlo",
  "Oberá": "Oberá",
  "San Ignacio": "San Ignacio",
  "San Javier": "San Javier",
  "San Pedro": "San Pedro"
};

function askSeat(feature) {
  const name = feature.properties.nombre;
  const correct = seats[name];
  const alternatives = shuffle(Object.values(seats).filter(seat => seat !== correct)).slice(0, 3);
  const layer = departmentLayer.getLayers().find(item => item.feature === feature);
  layer.setStyle({color: "#174f91", fillColor: "#378dd0", fillOpacity: 0.75, weight: 3}).bringToFront();
  for (const seat of shuffle([correct, ...alternatives])) {
    const button = document.createElement("button");
    button.textContent = seat;
    button.onclick = () => {
      if (seat === correct) {
        handleDepartmentClick(layer, feature);
      } else {
        attempts += 1;
        button.disabled = true;
        updateStats();
        showToast("Probá con otra localidad.", "error");
      }
    };
    answers.append(button);
  }
}

function normalizeName(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function baseStyle(feature) {
  const solved = feature.properties.solved;
  if (feature.geometry.type === "MultiLineString") return {color: solved ? colors.completed : "#006ba4", weight: 5, fill: false};
  return {
    color: solved ? colors.completed : colors.border,
    weight: solved ? 2 : 1.4,
    fillColor: solved ? colors.completed : colors.base,
    fillOpacity: solved ? 0.62 : 0.34,
    opacity: 0.95
  };
}

function showToast(message, tone = "dark") {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.style.background = tone === "ok" ? "rgba(16, 85, 60, 0.95)" : tone === "error" ? "rgba(163, 50, 39, 0.95)" : "rgba(23, 32, 29, 0.92)";
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function updateStats() {
  scoreValue.textContent = score;
  attemptsValue.textContent = attempts;
  remainingValue.textContent = remaining.length;
}

function pickNext() {
  answers.replaceChildren();
  hint.open = false;
  hint.hidden = !remaining.length || mode.value !== "water";
  if (remaining.length === 0) {
    current = null;
    targetName.textContent = "Juego completado";
    showToast(`¡Completaste la ronda en ${attempts} intentos!`, "ok");
    return;
  }

  current = remaining[0];
  document.querySelector("#clue").textContent = current.properties.clue || "";
  targetName.textContent = current.properties.nombre;
  if (mode.value === "seats") askSeat(current);
}

function handleDepartmentClick(layer, feature) {
  if (!current || feature.properties.solved) return;

  attempts += 1;
  const clicked = normalizeName(feature.properties.nombre);
  const expected = normalizeName(current.properties.nombre);

  if (clicked === expected) {
    feature.properties.solved = true;
    score += 1;
    remaining = remaining.filter((item) => item.properties.id !== feature.properties.id);
    layer.setStyle(baseStyle(feature));
    const label = mode.value === "seats" ? seats[feature.properties.nombre] : feature.properties.nombre;
    layer.bindTooltip(label, {
      permanent: true,
      direction: "center",
      className: "department-label"
    }).openTooltip();
    showToast(`¡Correcto! ${label}`, "ok");
    updateStats();
    pickNext();
  } else {
    layer.setStyle({ fillColor: colors.wrong, fillOpacity: 0.62, color: colors.wrong });
    showToast(`Ese es ${feature.properties.nombre}. Busca ${current.properties.nombre}.`, "error");
    window.setTimeout(() => {
      if (!feature.properties.solved) layer.setStyle(baseStyle(feature));
    }, 650);
    updateStats();
  }
}

function wireFeature(feature, layer) {
  layer.on({
    mouseover: () => {
      if (!feature.properties.solved) {
        layer.setStyle(feature.geometry.type === "MultiLineString"
          ? {color: "#008ccb", weight: 7}
          : {fillColor: colors.hover, fillOpacity: 0.58, weight: 2.4});
        layer.bringToFront();
      }
    },
    mouseout: () => {
      if (!feature.properties.solved) layer.setStyle(baseStyle(feature));
    },
    click: () => handleDepartmentClick(layer, feature)
  });
}

function resetGame() {
  score = 0;
  attempts = 0;
  departments.forEach((feature) => {
    feature.properties.solved = false;
  });
  remaining = shuffle(departments);
  departmentLayer.eachLayer((layer) => {
    layer.unbindTooltip();
    layer.setStyle(baseStyle(layer.feature));
  });
  updateStats();
  pickNext();
}

async function start() {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const outline = L.geoJSON(province, {interactive: false, style: {color: "#35634e", weight: 1, fillOpacity: 0.12}}).addTo(map);
  map.attributionControl.addAttribution('Límites: IGN · Cursos: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  const riverRenderer = L.canvas({tolerance: 6});
  function chooseRound() {
    departmentLayer?.remove();
    toast.classList.remove("show");
    const rivers = mode.value === "water";
    departments = rivers ? water : province.features;
    const capitals = mode.value === "seats";
    document.querySelector("#instruction").textContent = capitals ? "Elegí la cabecera del departamento" : rivers ? "Tocá el recorrido de" : "Tocá el departamento";
    departmentLayer = L.geoJSON(departments, {
      renderer: rivers ? riverRenderer : undefined,
      interactive: !capitals,
      style: baseStyle, onEachFeature: capitals ? undefined : wireFeature
    }).addTo(map);
    resetGame();
    map.invalidateSize();
    map.fitBounds(outline.getBounds(), {padding: [16, 16]});
  }
  mode.addEventListener("change", chooseRound);
  chooseRound();
}

resetButton.addEventListener("click", resetGame);

start().catch((error) => {
  console.error(error);
  targetName.textContent = "No se pudo cargar el mapa";
  showToast("Revisa la conexión o abre la página desde un servidor local.", "error");
});
