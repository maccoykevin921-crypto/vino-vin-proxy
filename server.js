import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// 🌍 Global VIN Decoder API (RapidAPI)
const VIN_API = "https://vindecoder.p.rapidapi.com/decode_vin";

app.get("/vin", async (req, res) => {
  const vin = req.query.vin;
  if (!vin) return res.status(400).json({ error: "VIN missing" });

  try {
    const response = await fetch(`${VIN_API}?vin=${vin}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY, // Set this on Render
        "X-RapidAPI-Host": "vindecoder.p.rapidapi.com"
      }
    });

    const data = await response.json();
    const result = data?.specification || data?.decode || {};

    if (!result || Object.keys(result).length === 0) {
      return res.status(404).json({ error: "No data found for this VIN" });
    }

    res.json({
      vin: vin.toUpperCase(),
      make: result.make || "N/A",
      model: result.model || "N/A",
      year: result.year || "N/A",
      manufacturer: result.manufacturer || "N/A",
      engine: result.engine || "N/A",
      cylinders: result.cylinders || "N/A",
      plant: result.plant || "N/A"
    });

  } catch (err) {
    console.error("VIN lookup failed:", err.message);
    res.status(500).json({ error: "VIN lookup failed", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ VIN Proxy live on port ${PORT}`));
