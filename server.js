import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const RAPID_API_KEY = process.env.RAPIDAPI_KEY;
const RAPID_API_HOST = "vindecoder.p.rapidapi.com";
const NHTSA_API = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/";

app.get("/vin", async (req, res) => {
  const vin = req.query.vin;
  if (!vin) return res.status(400).json({ error: "VIN missing" });

  try {
    // 1️⃣ Try RapidAPI first
    const rapidRes = await fetch(`https://${RAPID_API_HOST}/decode_vin?vin=${vin}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPID_API_KEY,
        "X-RapidAPI-Host": RAPID_API_HOST
      }
    });

    let rapidData = await rapidRes.json();

    // RapidAPI format check
    if (rapidData && rapidData.specification) {
      return res.json({
        vin,
        make: rapidData.specification.make || "N/A",
        model: rapidData.specification.model || "N/A",
        year: rapidData.specification.year || "N/A",
        manufacturer: rapidData.specification.manufacturer || "N/A",
        engine: rapidData.specification.engine || "N/A",
        cylinders: rapidData.specification.cylinders || "N/A",
        plant: rapidData.specification.plant || "N/A",
        source: "RapidAPI"
      });
    }

    // 2️⃣ Fallback to NHTSA if RapidAPI fails
    const nhtsaRes = await fetch(`${NHTSA_API}${vin}?format=json`);
    const nhtsaData = await nhtsaRes.json();

    if (nhtsaData && nhtsaData.Results && nhtsaData.Results[0]) {
      const r = nhtsaData.Results[0];
      return res.json({
        vin,
        make: r.Make || "N/A",
        model: r.Model || "N/A",
        year: r.ModelYear || "N/A",
        manufacturer: r.Manufacturer || "N/A",
        engine: r.EngineModel || "N/A",
        cylinders: r.EngineCylinders || "N/A",
        plant: r.PlantCity || "N/A",
        source: "NHTSA"
      });
    }

    // 3️⃣ If both fail
    return res.status(404).json({ error: "No data found for this VIN" });
  } catch (err) {
    console.error("VIN lookup failed:", err.message);
    res.status(500).json({
      error: "VIN lookup failed",
      details: err.message
    });
  }
});

// Default port (Render auto-assigns)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ VIN Proxy live on port ${PORT}`));
