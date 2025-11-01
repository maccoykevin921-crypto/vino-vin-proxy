import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Free VIN decode API (NHTSA)
const VIN_API = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/";

app.get("/vin", async (req, res) => {
  const vin = req.query.vin;
  if (!vin) return res.status(400).json({ error: "VIN missing" });

  try {
    const response = await fetch(`${VIN_API}${vin}?format=json`);
    const data = await response.json();

    if (!data.Results || !data.Results[0]) {
      return res.status(404).json({ error: "No data found" });
    }

    const r = data.Results[0];
    res.json({
      vin,
      make: r.Make || "Unknown",
      model: r.Model || "Unknown",
      year: r.ModelYear || "N/A",
      manufacturer: r.Manufacturer || r.Make || "N/A",
      engine: r.EngineModel || r.EngineCylinders || "N/A",
      plant: r.PlantCity || "N/A"
    });
  } catch (err) {
    console.error("VIN lookup failed:", err.message);
    res.status(500).json({ error: "VIN lookup failed", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ VIN Proxy live on port ${PORT}`));
