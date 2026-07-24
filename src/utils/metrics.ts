import {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from "prom-client";

// 1. Create a new registry for our custom metrics
export const register = new Registry();

// 2. Collect default Node.js metrics (CPU usage, Memory, Event Loop lag, etc.)
collectDefaultMetrics({ register });

// 3. Custom Metric: Total HTTP requests
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [register],
});

// 4. Custom Metric: HTTP request duration (latency)
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "path", "status"],
  // Buckets define the latency thresholds we want to track
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});
