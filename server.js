import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Root route for Render check
app.get("/", (req, res) => {
  res.send("✅ Vino Auto BenchLab VIN Proxy is running");
});

// VIN decode route
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
    res.json(data.Results[0]);
  } catch (error) {
    res.status(500).json({
      error: "VIN fetch failed",
      details: error.message,
    });
  }
});

// fallback route for /vin GET
app.get("/vin", (req, res) => {
  res.status(405).send("Use POST /vin with JSON body { vin: 'yourVIN' }");
});

// start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
