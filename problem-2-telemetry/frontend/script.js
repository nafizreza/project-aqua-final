// Backend API base URL
const API_BASE = "http://localhost:3000";

const els = {
  depth: document.getElementById("depth"),
  pressure: document.getElementById("pressure"),
  temperature: document.getElementById("temperature"),
  direction: document.getElementById("direction"),
  timestamp: document.getElementById("timestamp"),
  statusBox: document.getElementById("statusBox"),
};

function formatNumber(x, digits = 2) {
  if (typeof x !== "number") return "--";
  return x.toFixed(digits);
}

// Updating status based on pressure
function computeStatus(pressure) {
  
  if (typeof pressure !== "number") return { text: "UNKNOWN", css: "normal" };
  if (pressure > 2.0) return { text: "CRITICAL", css: "critical" };
  if (pressure >= 1.8 && pressure <= 2.0) return { text: "WARNING", css: "warning" };
  return { text: "NORMAL", css: "normal" };
}

function setStatus(pressure) {
  const s = computeStatus(pressure);

  // reset classes
  els.statusBox.classList.remove("normal", "warning", "critical");
  els.statusBox.classList.add(s.css);
  els.statusBox.textContent = `STATUS: ${s.text}`;
  // Visual Alert at STATUS:CRITICAL (screen blink)
  document.body.classList.toggle("critical-blink", s.css === "critical"); 

}


// Chart setup
const ctx = document.getElementById("depthChart");
const labels = [];     
const depthData = [];  

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels,
    datasets: [{
      label: "Depth (m)",
      data: depthData,
      tension: 0.25
    }]
  },
  options: {
  responsive: true,
  animation: false,
  scales: {
    x: {
      title: {
        display: true,
        text: "Time",
        color: "#ffffff"
      },
      ticks: {
        color: "#ffffff"
      },
      grid: {
        color: "rgba(255, 255, 255, 0.3)"
      }
    },
    y: {
      title: {
        display: true,
        text: "Depth (m)",
        color: "#ffffff"
      },
      ticks: {
        color: "#ffffff"
      },
      grid: {
        color: "rgba(255, 255, 255, 0.3)"
      }
    }
  }
}

});

// Adding points to Depth vs Time chart
function addChartPoint(timestampStr, depth) {
  // Using HH:MM:SS as label
  const d = new Date(timestampStr);
  const label = Number.isNaN(d.getTime())
    ? String(timestampStr)
    : d.toLocaleTimeString();

  labels.push(label);
  depthData.push(depth);

  const MAX_POINTS = 50;
  while (labels.length > MAX_POINTS) labels.shift();
  while (depthData.length > MAX_POINTS) depthData.shift();

  chart.update();
}

//Polling the /api/telemetry/latest endpoint
async function fetchLatest() {
  const res = await fetch(`${API_BASE}/api/telemetry/latest`);
  if (!res.ok) throw new Error(`latest failed: ${res.status}`);
  return res.json();
}


function renderTelemetry(t) {
  els.depth.textContent = formatNumber(t.depth, 2);
  els.pressure.textContent = formatNumber(t.pressure, 2);
  els.temperature.textContent = formatNumber(t.temperature, 1);
  els.direction.textContent = formatNumber(t.direction, 0);
  els.timestamp.textContent = t.timestamp ?? "--";

  setStatus(t.pressure);
  addChartPoint(t.timestamp, t.depth);
}

async function tick() {
  try {
    const t = await fetchLatest();
    renderTelemetry(t);
  } catch (err) {
  document.body.classList.remove("critical-blink");  
  els.statusBox.classList.remove("normal", "warning", "critical", "error");
  els.statusBox.classList.add("error");
  els.statusBox.textContent = `SYSTEM ERROR: ${err.message}`;
  }

}

// Initial load + repeat every 5 seconds
tick();
setInterval(tick, 5000);
