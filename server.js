import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Root test route
app.get("/", (req, res) => {
  res.send("✅ Vino Auto BenchLab VIN Proxy is running");
});

// VIN decode POST route
app.post("/vin", async (req, res) => {
  const { vin } = req.body;

  if (!vin) {
    return res.status(400).json({ error: "VIN required" });
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
    );
    const data = await response.json();

    if (data && data.Results && data.Results.length > 0) {
      res.json({
        success: true,
        vin,
        make: data.Results[0].Make,
        model: data.Results[0].Model,
        year: data.Results[0].ModelYear,
        manufacturer: data.Results[0].Manufacturer,
        bodyClass: data.Results[0].BodyClass,
        engine: data.Results[0].EngineModel,
      });
    } else {
      res.status(404).json({ error: "No data found for VIN" });
    }
  } catch (error) {
    res.status(500).json({
      error: "VIN fetch failed",
      details: error.message,
    });
  }
});

// Optional GET fallback for /vin
app.get("/vin", (req, res) => {
  res.status(405).send("⚠️ Use POST /vin with JSON body { vin: 'yourVIN' }");
});

// Start server (Render assigns the port)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
