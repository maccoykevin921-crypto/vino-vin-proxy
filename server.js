import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Root route — just to verify server is online
app.get("/", (req, res) => {
  res.send("✅ Vino VIN Proxy is online and ready!");
});

// --- VIN DECODER ROUTES --- //

// Format 1: /vin/:vin (e.g. /vin/1HGCM82633A004352)
app.get("/vin/:vin", async (req, res) => {
  try {
    const vin = req.params.vin?.toUpperCase();
    if (!vin) {
      return res.status(400).json({ error: "Missing VIN parameter" });
    }

    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    );
    const data = await response.json();
    const result = data.Results[0];

    res.json({
      success: true,
      vin,
      make: result.Make || "Unknown",
      model: result.Model || "Unknown",
      year: result.ModelYear || "Unknown",
      manufacturer: result.Manufacturer || "Unknown",
      country: result.PlantCountry || "Unknown",
      plantCity: result.PlantCity || "Unknown",
    });
  } catch (error) {
    console.error("VIN decode failed:", error);
    res.status(500).json({ error: "Server error while decoding VIN" });
  }
});

// Format 2: /vin?vin=XXXX (e.g. /vin?vin=1HGCM82633A004352)
app.get("/vin", async (req, res) => {
  try {
    const vin = req.query.vin?.toUpperCase();
    if (!vin) {
      return res.status(400).json({ error: "Missing VIN parameter" });
    }

    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    );
    const data = await response.json();
    const result = data.Results[0];

    res.json({
      success: true,
      vin,
      make: result.Make || "Unknown",
      model: result.Model || "Unknown",
      year: result.ModelYear || "Unknown",
      manufacturer: result.Manufacturer || "Unknown",
      country: result.PlantCountry || "Unknown",
      plantCity: result.PlantCity || "Unknown",
    });
  } catch (error) {
    console.error("VIN decode failed:", error);
    res.status(500).json({ error: "Server error while decoding VIN" });
  }
});

// Catch-all fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// --- START SERVER --- //
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Vino VIN Proxy running on port ${PORT}`));
