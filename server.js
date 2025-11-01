import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("✅ Vino VIN Proxy is online and fully upgraded!");
});

// VIN Decoder route (with color + manufacturer)
app.get("/vin", async (req, res) => {
  try {
    const vin = req.query.vin?.toUpperCase();
    const isPro = req.query.pro === "true"; // paid version

    if (!vin) {
      return res.status(400).json({ error: "Missing VIN parameter" });
    }

    // Fetch decoded data from NHTSA
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    );
    const data = await response.json();
    const r = data.Results[0];

    // Base VIN info
    const result = {
      vin,
      make: r.Make || "Unknown",
      model: r.Model || "Unknown",
      year: r.ModelYear || "Unknown",
      manufacturer: r.Manufacturer || "Unknown",
      bodyClass: r.BodyClass || "Unknown",
      engine: r.EngineModel || "Unknown",
      fuelType: r.FuelTypePrimary || "Unknown",
      color: r.Color || "Not Listed",
      country: r.PlantCountry || "Unknown",
      city: r.PlantCity || "Unknown",
      premium: isPro,
      message: "Basic VIN information retrieved successfully ✅"
    };

    // If Pro version, include advanced visuals
    if (isPro) {
      result.message = "Full BenchLab Pro report unlocked 🚀";
      result.ecuImage = `https://vinoautomechanic.com/assets/ecu/${r.Make}_${r.Model}_${r.ModelYear}.jpg`;
      result.wiringDiagram = `https://vinoautomechanic.com/assets/wiring/${r.Make}_${r.Model}_${r.ModelYear}.jpg`;
    }

    res.json(result);
  } catch (error) {
    console.error("VIN decode failed:", error);
    res.status(500).json({ error: "Server error while decoding VIN" });
  }
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚗 Vino VIN Proxy running smoothly on port ${PORT}`)
);
