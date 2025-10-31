// ===== Vino Auto BenchLab VIN Proxy =====
// Express backend for decoding VIN data

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// POST endpoint for VIN decoding
app.post("/vin", async (req, res) => {
  const { vin } = req.body;

  if (!vin) {
    return res.status(400).json({ error: "VIN is required" });
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    );
    const data = await response.json();
    res.json(data.Results[0]);
  } catch (error) {
    console.error("Error fetching VIN data:", error);
    res.status(500).json({ error: "Failed to fetch VIN data" });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("✅ Vino Auto BenchLab VIN Proxy is running");
});

// Server listener
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
