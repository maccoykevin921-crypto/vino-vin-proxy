import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// VIN Proxy for Vino Auto BenchLab
app.post("/vin", async (req, res) => {
  const { vin } = req.body;

  if (!vin) {
    return res.status(400).json({ error: "VIN number required" });
  }

  try {
    // Hidden VIN source (Car-box & others)
    const response = await fetch(`https://car-box.info/api/vin/${vin}`);
    const data = await response.json();

    const result = {
      vin,
      make: data.make || "Unknown",
      model: data.model || "Unknown",
      year: data.year || "N/A",
      engine: data.engine || "N/A",
      message: "Vehicle data verified by Vino Auto BenchLab AI"
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "VIN lookup failed", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("✅ Vino Auto BenchLab VIN Proxy running on port 3000");
});