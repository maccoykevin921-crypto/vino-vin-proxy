import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// ===== VIN Decode Route =====
app.post("/vin", async (req, res) => {
  const { vin } = req.body;

  if (!vin || vin.length < 11) {
    return res.status(400).json({ error: "Invalid or missing VIN." });
  }

  try {
    // Global VIN Decoder API (Vindecoder.eu)
    const apiKey = process.env.VIN_API_KEY; // Set this in Render
    const url = `https://api.vindecoder.eu/3.2/${apiKey}/decode/${vin}.json`;

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.decode && data.decode.length > 0) {
      const vehicle = data.decode[0];
      res.json({
        success: true,
        vin,
        make: vehicle.make || "Unknown",
        model: vehicle.model || "Unknown",
        year: vehicle.year || "Unknown",
        engine: vehicle.engine || "N/A",
        body: vehicle.body || "N/A",
      });
    } else {
      res.status(404).json({ error: "No data found for this VIN." });
    }
  } catch (error) {
    console.error("VIN fetch failed:", error);
    res.status(500).json({
      error: "VIN fetch failed",
      details: error.message,
    });
  }
});

// ===== Fallback GET route =====
app.get("/vin", (req, res) => {
  res.status(405).send("⚠️ Use POST /vin with VIN in JSON body");
});

// ===== Start server =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`✅ Vino Auto VIN Proxy running on port ${PORT}`)
);
