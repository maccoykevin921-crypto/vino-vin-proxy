// Vino Auto BenchLab Combined Server
// VIN Proxy + Orders/Download API

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------
// 🔹 VIN LOOKUP ENDPOINT
// ------------------------------
app.get("/vin", async (req, res) => {
  const vin = req.query.vin;
  if (!vin) return res.status(400).json({ error: "VIN required" });

  try {
    const data = {
      vin,
      make: "MERCEDES-BENZ",
      model: "C-Class",
      year: "2008",
      engine: "M272 3.0L V6",
      manufacturer: "Mercedes-Benz AG"
    };

    return res.json({ success: true, data });
  } catch (err) {
    console.error("VIN error:", err);
    res.status(500).json({ error: "VIN lookup failed" });
  }
});

// ------------------------------
// 🔹 ORDERS & DOWNLOAD CONTROL
// ------------------------------
let ORDERS = {}; // Store active orders in memory

app.post("/create-order", (req, res) => {
  const { orderId, vin } = req.body;
  if (!orderId || !vin)
    return res.status(400).json({ error: "Missing orderId or VIN" });

  ORDERS[orderId] = { vin, paid: true, created: new Date() };
  console.log(`✅ Order created: ${orderId} for VIN ${vin}`);
  res.json({ success: true, message: "Order created successfully." });
});

app.get("/download", (req, res) => {
  const { orderId, file } = req.query;
  if (!orderId || !file)
    return res.status(400).json({ error: "Missing orderId or file" });

  if (!ORDERS[orderId] || !ORDERS[orderId].paid)
    return res.status(403).json({ error: "Payment required to download" });

  const filePath = path.join("files", file);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "File not found" });

  res.download(filePath);
});

// ------------------------------
// 🔹 STATUS & HEALTH CHECK
// ------------------------------
app.get("/", (req, res) => {
  res.send("✅ Vino Auto BenchLab Combined Server is running.");
});

// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Combined Server running on port ${PORT}`)
);
