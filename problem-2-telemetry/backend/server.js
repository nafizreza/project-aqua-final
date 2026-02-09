
const http = require("http");
const fs = require("fs");
const path = require("path");

// Config
const PORT = 3000;
const SIM_INTERVAL_MS = 5000;
const MAX_HISTORY = 100;

// Load sensor_data_500.json 
const dataPath = path.join(__dirname, "sensor_data_500.json");
const frontendDir = path.join(__dirname, "..", "frontend");

let dataset = [];
try {
  const raw = fs.readFileSync(dataPath, "utf-8");
  dataset = JSON.parse(raw);

  if (!Array.isArray(dataset)) {
    throw new Error("sensor_data_500.json must be an array");
  }
} catch (err) {
  console.error("Failed to load sensor_data_500.json:", err.message);
  process.exit(1);
}


// In-memory telemetry store
let latestTelemetry = null; 
const history = [];         // FIFO buffer (MAX_HISTORY 100)

// Push into FIFO history
function pushHistory(entry) {
  history.push(entry);
  while (history.length > MAX_HISTORY) history.shift();
  latestTelemetry = entry;
}


function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

//Telemetry Validation
function validateTelemetry(obj) {
  const errors = [];

  // Required fields
  const required = ["depth", "pressure", "temperature", "direction", "timestamp"];
  for (const key of required) {
    if (!(key in obj)) errors.push(`Missing field: ${key}`);
  }
  if (errors.length) return errors;

  // Checking Types
  if (!isFiniteNumber(obj.depth)) errors.push("depth must be a number");
  if (!isFiniteNumber(obj.pressure)) errors.push("pressure must be a number");
  if (!isFiniteNumber(obj.temperature)) errors.push("temperature must be a number");
  if (!isFiniteNumber(obj.direction)) errors.push("direction must be a number");

  if (typeof obj.timestamp !== "string") errors.push("timestamp must be a string");

  // Checking Range
  if (isFiniteNumber(obj.depth) && (obj.depth < 0 || obj.depth > 30)) {
    errors.push("depth must be in range 0-30 meters");
  }
  if (isFiniteNumber(obj.pressure) && (obj.pressure < 1 || obj.pressure > 4)) {
    errors.push("pressure must be in range 1-4 bar");
  }
  if (isFiniteNumber(obj.temperature) && (obj.temperature < 5 || obj.temperature > 25)) {
    errors.push("temperature must be in range 5-25 °C");
  }
  if (isFiniteNumber(obj.direction) && (obj.direction < 0 || obj.direction > 360)) {
    errors.push("direction must be in range 0-360 degrees");
  }

  // Timestamp format sanity check
  const t = Date.parse(obj.timestamp);
  if (Number.isNaN(t)) errors.push("timestamp must be a valid date/time string");

  return errors;
}


function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // CORS
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(text);
}

// Manual body parsing 
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf-8");
      // Safety: prevent giant payloads
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", (err) => reject(err));
  });
}


// Simulation: stream dataset every 5 seconds
let simIndex = 0;

function startSimulation() {
  //At server start, seeding the first telemetry entry so /latest works immediately.
  if (dataset.length > 0) {
    pushHistory(dataset[0]);
    simIndex = 1 % dataset.length;
  }

  setInterval(() => {
    if (dataset.length === 0) return;

    const entry = dataset[simIndex];
    pushHistory(entry);

    simIndex++;
    if (simIndex >= dataset.length) simIndex = 0;
  }, SIM_INTERVAL_MS);
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function serveFile(res, filePath) {
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}


// HTTP server + manual routing
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // Parsing URL and path
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // Route: GET /api/telemetry/latest
  if (req.method === "GET" && pathname === "/api/telemetry/latest") {
    if (!latestTelemetry) return sendJson(res, 404, { error: "No telemetry available yet" });
    return sendJson(res, 200, latestTelemetry);
  }

  // Route: GET /api/telemetry/history?limit=N
  if (req.method === "GET" && pathname === "/api/telemetry/history") {
    let limit = Number(urlObj.searchParams.get("limit") ?? "50");
    if (!Number.isFinite(limit)) limit = 50;

    limit = Math.max(1, Math.min(100, Math.floor(limit)));

    const slice = history.slice(-limit);
    return sendJson(res, 200, slice);
  }

  // Route: POST /api/telemetry
  if (req.method === "POST" && pathname === "/api/telemetry") {
    try {
      const rawBody = await readRequestBody(req);

      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }

      const errors = validateTelemetry(payload);
      if (errors.length > 0) {
        return sendJson(res, 422, { error: "Validation failed", details: errors });
      }

      pushHistory(payload);
      return sendJson(res, 201, { ok: true, stored: payload });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }


  if (req.method === "GET" && pathname === "/") {
  return serveFile(res, path.join(frontendDir, "index.html"));
  }

  if (req.method === "GET" && pathname === "/script.js") {
  return serveFile(res, path.join(frontendDir, "script.js"));
  }



  // Default: not found
  sendText(res, 404, "Not Found");
});

// Starting everything
server.listen(PORT, () => {
  console.log(`Telemetry server running: http://localhost:${PORT}`);
  console.log(`Latest:  http://localhost:${PORT}/api/telemetry/latest`);
  console.log(`History: http://localhost:${PORT}/api/telemetry/history?limit=10`);
});

startSimulation();
