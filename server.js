import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ message: "Vino VIN Proxy is live ✅" });
});

// VIN lookup (mock)
app.post("/lookup", (req, res) => {
  const { vin } = req.body;
  if (!vin) return res.status(400).json({ error: "VIN missing" });
  res.json({ vin, result: "VIN lookup mock successful" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
