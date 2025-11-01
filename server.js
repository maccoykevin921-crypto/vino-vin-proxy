// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import shortid from "shortid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",") : ["https://vinoautomechanic.com","http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: "200kb" }));
app.use(morgan("tiny"));

// Ensure folders exist
const LOGS_DIR = path.join(__dirname, "logs");
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const VIN_LOG_FILE = path.join(LOGS_DIR, "vin-logs.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// init files if missing
if (!fs.existsSync(VIN_LOG_FILE)) fs.writeFileSync(VIN_LOG_FILE, "[]", "utf8");
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]", "utf8");

/**
 * Helper: append JSON entry to a local array file
 */
function appendJsonFile(filePath, entry) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const arr = JSON.parse(raw || "[]");
    arr.unshift(entry); // newest first
    // keep file length sane (store last 500)
    if (arr.length > 500) arr.length = 500;
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("appendJsonFile error:", err);
    return false;
  }
}

/**
 * Health check root
 */
app.get("/", (req, res) => {
  res.json({ status: "Vino VIN Proxy online", timestamp: new Date().toISOString() });
});

/**
 * VIN lookup route
 * Example: GET /vin?vin=1HGCM82633A004352
 *
 * Uses NHTSA VPIC API as primary (free), returns a compact response
 */
app.get("/vin", async (req, res) => {
  try {
    const vin = String(req.query.vin || "").trim().toUpperCase();
    if (!vin || vin.length < 11) {
      return res.status(400).json({ error: "Missing or invalid VIN parameter" });
    }

    // Call NHTSA VPIC decode endpoint
    const apiUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`;
    const apiResp = await fetch(apiUrl, { method: "GET" , headers: { "User-Agent": "Vino-VIN-Proxy/1.0" }});
    if (!apiResp.ok) {
      console.warn("NHTSA API returned", apiResp.status);
    }
    const apiJson = await apiResp.json();
    const r = Array.isArray(apiJson.Results) ? apiJson.Results[0] || {} : (apiJson.Results || {});

    // Map fields (very defensive)
    const result = {
      success: true,
      vin,
      make: r.Make || r.VehicleManufacturerName || "Unknown",
      model: r.Model || "Unknown",
      year: r.ModelYear || r.Year || "Unknown",
      manufacturer: r.Manufacturer || "Unknown",
      engine: r.EngineModel || r.Engine || r.Displacement || "Unknown",
      fuelType: r.FuelTypePrimary || "Unknown",
      bodyClass: r.BodyClass || "Unknown"
    };

    // If you want to include OEM color / plant fields if present
    if (r.Color) result.color = r.Color;
    if (r.PlantCountry) result.plantCountry = r.PlantCountry;
    if (r.PlantCity) result.plantCity = r.PlantCity;

    // Append lookup log (non-blocking)
    const logEntry = {
      id: shortid.generate(),
      vin,
      result,
      from: req.get("origin") || req.ip || req.headers["x-forwarded-for"] || "unknown",
      ts: new Date().toISOString()
    };
    try { appendJsonFile(VIN_LOG_FILE, logEntry); } catch (e) { console.error("log append fail", e); }

    // Return compact result for frontend
    res.json(result);

  } catch (err) {
    console.error("VIN decode failed:", err);
    res.status(500).json({ error: "Server error while decoding VIN" });
  }
});

/**
 * Create order endpoint (called after Quick Pay / Unlock Pro)
 * Simple, stores order + returns order id
 * POST body: { vin, email, amount, product: "pro-unlock" }
 */
app.post("/create-order", async (req, res) => {
  try {
    const { vin = "", email = "", amount = 0, product = "pro-unlock" } = req.body || {};
    if (!email || !amount) {
      return res.status(400).json({ error: "Missing payment/order details" });
    }

    const order = {
      id: `${Date.now()}-${randomBytes(4).toString("hex")}`,
      vin: String(vin || "").toUpperCase(),
      email,
      product,
      amount,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    appendJsonFile(ORDERS_FILE, order);

    // Return order id to client (client should call payment gateway)
    res.json({ success: true, order });
  } catch (err) {
    console.error("create-order error:", err);
    res.status(500).json({ error: "Server error creating order" });
  }
});

/**
 * Get recent VIN logs (admin use)
 * NOTE: In production protect with an auth key or IP allowlist
 */
app.get("/admin/recent-vins", (req, res) => {
  try {
    const raw = fs.readFileSync(VIN_LOG_FILE, "utf8");
    const arr = JSON.parse(raw || "[]");
    // Return first 50 logs
    res.json({ success: true, count: arr.length, logs: arr.slice(0, 50) });
  } catch (err) {
    console.error("recent-vins error:", err);
    res.status(500).json({ error: "Cannot read VIN logs" });
  }
});

/**
 * Get orders (admin)
 */
app.get("/admin/orders", (req, res) => {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, "utf8");
    const arr = JSON.parse(raw || "[]");
    res.json({ success: true, count: arr.length, orders: arr.slice(0, 100) });
  } catch (err) {
    console.error("orders read error:", err);
    res.status(500).json({ error: "Cannot read orders" });
  }
});

/**
 * Fallback
 */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/**
 * Start server
 */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Vino VIN Proxy running on port ${PORT} — NODE_ENV=${process.env.NODE_ENV || "dev"}`);
});
