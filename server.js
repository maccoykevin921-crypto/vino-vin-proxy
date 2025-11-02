import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root route check
app.get("/", (req, res) => {
  res.send("✅ Vino VIN Proxy & Partner System is online and ready!");
});

// ✅ VIN Lookup Endpoint (unchanged)
app.get("/vin", async (req, res) => {
  try {
    const vin = req.query.vin?.toUpperCase();
    if (!vin) return res.status(400).json({ error: "Missing VIN parameter" });

    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await response.json();
    const result = data.Results[0];

    res.json({
      success: true,
      vin,
      make: result.Make || "Unknown",
      model: result.Model || "Unknown",
      year: result.ModelYear || "Unknown",
      manufacturer: result.Manufacturer || "Unknown",
      country: result.PlantCountry || "Unknown",
      plantCity: result.PlantCity || "Unknown"
    });
  } catch (error) {
    console.error("VIN decode failed:", error);
    res.status(500).json({ error: "Server error while decoding VIN" });
  }
});

// ✅ Partner Apply Endpoint with Email Support
app.post("/partner-apply", async (req, res) => {
  const data = req.body;
  console.log("📩 New Partner Application:", data);

  // --- 1️⃣ Send response to frontend ---
  res.json({ success: true, message: "Application received", data });

  // --- 2️⃣ Send email copy to admin inbox ---
  try {
    // Configure your email transport (using Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "vino.incorganisation@gmail.com",
        pass: process.env.EMAIL_PASS // set in Render Environment Variables
      }
    });

    const mailOptions = {
      from: `"Vino Auto BenchLab" <vino.incorganisation@gmail.com>`,
      to: "info@vinoautomechanic.com, vino.incorganisation@gmail.com", // recipients
      subject: `New Partner Application — ${data.type || "General"}`,
      html: `
        <h2>🚗 New Partner Application Received</h2>
        <p><b>Business Name:</b> ${data.business}</p>
        <p><b>Owner:</b> ${data.owner}</p>
        <p><b>Country:</b> ${data.country}</p>
        <p><b>Type:</b> ${data.type}</p>
        <p><b>WhatsApp:</b> ${data.whatsapp}</p>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>Message:</b> ${data.message || "No message provided"}</p>
        <hr>
        <p style="font-size:12px;color:#555;">Sent automatically from Vino Auto BenchLab Partner Portal.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("📨 Partner email sent successfully");
  } catch (err) {
    console.error("❌ Email send failed:", err);
  }
});

// ✅ Fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
