# Problem 2 — Telemetry Backend API Specification (Native Node.js)

This document describes the HTTP API implemented in `problem-2-telemetry/backend/server.js`.

---

## Base URL

- `http://localhost:3000`

## Content Type

- Request bodies must be JSON:
  - `Content-Type: application/json`
- API responses are JSON:
  - `Content-Type: application/json`

## CORS

CORS is enabled for all origins:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET,POST,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

### Preflight
- `OPTIONS *` returns `204 No Content`

---

## Telemetry Object Schema

A telemetry record is a JSON object with the following required fields:

| Field | Type | Required | Constraints |
|------|------|----------|------------|
| `depth` | number | ✅ | finite number, **0-30** (meters) |
| `pressure` | number | ✅ | finite number, **1-4** (bar) |
| `temperature` | number | ✅ | finite number, **5-25** (°C) |
| `direction` | number | ✅ | finite number, **0-360** (degrees wrt North) |
| `timestamp` | string | ✅ | must be parseable by `Date.parse()` |

### Example
```json
{
  "depth": 12.5,
  "pressure": 1.9,
  "temperature": 18.2,
  "direction": 270,
  "timestamp": "2026-01-27T10:15:00Z"
}
