import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root check
app.get("/", (req, res) => {
  res.send("✅ Vino Auto BenchLab Backend — VIN, Partner & Email Systems Online!");
});

// ✅ VIN Lookup Endpoint
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

// ✅ Partner Application Route (with Logo Branding + Auto Reply)
app.post("/partner-apply", async (req, res) => {
  const data = req.body;
  console.log("📩 New Partner Application:", data);

  res.json({ success: true, message: "Application received", data });

  try {
    // --- 1️⃣ Setup Gmail transporter (App Password required) ---
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "vino.incorganisation@gmail.com",
        pass: process.env.EMAIL_PASS
      }
    });

    // --- 2️⃣ Define logo image (must be online-accessible) ---
    const logoUrl = "https://img1.wsimg.com/isteam/ip/7aee3f1a-9b34-47b3-99b3-6d702d9fcb3a/logo.png"; // Replace with your final logo URL from GoDaddy

    // --- 3️⃣ Admin Notification Email ---
    const adminMail = {
      from: `"Vino Auto BenchLab" <vino.incorganisation@gmail.com>`,
      to: "info@vinoautomechanic.com, vino.incorganisation@gmail.com",
      subject: `🚗 New Partner Application — ${data.type || "General"}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;background:#1C1C1E;color:#FFFAFA;border-radius:12px;">
          <div style="text-align:center;margin-bottom:10px;">
            <img src="${logoUrl}" alt="Vino Auto BenchLab" style="width:160px;height:auto;border-radius:8px;">
          </div>
          <h2 style="color:#8B0000;">New Partner Application Received</h2>
          <p><b>Business Name:</b> ${data.business}</p>
          <p><b>Owner:</b> ${data.owner}</p>
          <p><b>Country:</b> ${data.country}</p>
          <p><b>Partnership Type:</b> ${data.type}</p>
          <p><b>WhatsApp:</b> ${data.whatsapp}</p>
          <p><b>Email:</b> ${data.email}</p>
          <p><b>Message:</b> ${data.message || "No message provided"}</p>
          <hr style="border:0;border-top:1px solid #333;">
          <p style="font-size:12px;color:#888;">📍 Sent automatically from the Vino Auto BenchLab Partner Portal.</p>
        </div>
      `
    };

    await transporter.sendMail(adminMail);
    console.log("📨 Admin email sent successfully");

    // --- 4️⃣ Auto-Reply to Partner ---
    const userMail = {
      from: `"Vino Auto BenchLab Team" <vino.incorganisation@gmail.com>`,
      to: data.email,
      subject: "✅ Your Partnership Application Has Been Received",
      html: `
        <div style="font-family:Arial,sans-serif;background:#1C1C1E;color:#FFFAFA;padding:25px;border-radius:10px;text-align:center;">
          <img src="${logoUrl}" alt="Vino Auto BenchLab" style="width:140px;border-radius:6px;margin-bottom:10px;">
          <h2 style="color:#8B0000;">Vino Auto BenchLab</h2>
          <p>Hello <b>${data.owner}</b>,</p>
          <p>We’ve received your partnership application as a <b>${data.type}</b>.</p>
          <p>Our review team is currently evaluating your information. You’ll receive an update soon once your profile is verified.</p>
          <p>We appreciate your interest in joining the trusted <b>Vino Auto BenchLab Network</b>.</p>
          <hr style="border:0;border-top:1px solid #333;">
          <p style="font-size:12px;color:#888;">This is an automated confirmation. Please do not reply.</p>
          <a href="https://vinoautomechanic.com" style="color:#FFFAFA;text-decoration:none;">Visit vinoautomechanic.com</a>
        </div>
      `
    };

    await transporter.sendMail(userMail);
    console.log("📬 Auto-reply sent to partner");
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
});

// ✅ Fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
