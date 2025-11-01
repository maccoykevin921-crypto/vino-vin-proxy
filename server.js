import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("✅ Vino VIN Proxy is online and ready!");
});

// VIN endpoint
app.get("/api/vin/:vin", (req, res) => {
  const vin = req.params.vin.toUpperCase();
  res.json({
    vin,
    message: `VIN lookup successful: ${vin}`,
    status: "Backend connected ✅"
  });
});

// Handle all unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
