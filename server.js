import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("✅ Vino VIN Proxy is online and ready!");
});

// Precision VIN Decoder route (matches front-end call)
app.get("/vin", async (req, res) => {
  try {
    const vin = req.query.vin?.toUpperCase();
    if (!vin) {
      return res.status(400).json({ error: "Missing VIN parameter" });
    }

    // Fetch from official NHTSA VIN decoder API
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await response.json();
    const result = data.Results[0];

    // Structured clean output
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

// Fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Vino VIN Proxy running on port ${PORT}`));
