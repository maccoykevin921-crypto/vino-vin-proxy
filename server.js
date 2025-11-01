import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root route
app.get("/", (req, res) => {
  res.send("✅ Vino VIN Proxy is online and ready!");
});

// ✅ VIN Decoder (supports both /vin/:vin and /vin?vin=)
async function decodeVin(vin, res) {
  try {
    if (!vin) return res.status(400).json({ error: "Missing VIN parameter" });
    vin = vin.toUpperCase();

    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await response.json();
    const r = data.Results[0];

    return res.json({
      success: true,
      vin,
      make: r.Make || "Unknown",
      model: r.Model || "Unknown",
      year: r.ModelYear || "Unknown",
      manufacturer: r.Manufacturer || "Unknown",
      bodyClass: r.BodyClass || "Unknown",
      country: r.PlantCountry || "Unknown",
      plantCity: r.PlantCity || "Unknown",
      transmission: r.TransmissionStyle || "Unknown",
      engine: r.EngineModel || r.EngineCylinders || "Unknown",
      vehicleType: r.VehicleType || "Unknown",
      fuelType: r.FuelTypePrimary || "Unknown",
      driveType: r.DriveType || "Unknown",
      restraintSystem: r.RestraintSystem || "Unknown",
      series: r.Series || "Unknown",
      trim: r.Trim || "Unknown",
      doors: r.Doors || "Unknown",
      gvwr: r.GVWR || "Unknown",
      brakeSystem: r.BrakeSystemType || "Unknown",
      modelID: r.ModelID || "Unknown"
    });
  } catch (error) {
    console.error("VIN decode failed:", error);
    return res.status(500).json({ error: "Server error while decoding VIN" });
  }
}

// ✅ Route format 1
app.get("/vin/:vin", async (req, res) => decodeVin(req.params.vin, res));

// ✅ Route format 2
app.get("/vin", async (req, res) => decodeVin(req.query.vin, res));

// ✅ Fallback for any other routes
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Vino VIN Proxy running on port ${PORT}`));
