import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

// Root Route
app.get("/", (req, res) => {
  res.send("✅ Vino VIN Proxy is online and BenchLab PDF ready!");
});

// VIN Decoder Route
app.get("/vin", async (req, res) => {
  try {
    const vin = req.query.vin?.toUpperCase();
    const isPro = req.query.pro === "true";
    if (!vin) return res.status(400).json({ error: "Missing VIN parameter" });

    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    );
    const data = await response.json();
    const r = data.Results[0];

    // Build response object
    const result = {
      success: true,
      vin,
      make: r.Make || "Unknown",
      model: r.Model || "Unknown",
      year: r.ModelYear || "Unknown",
      manufacturer: r.Manufacturer || "Unknown",
      bodyClass: r.BodyClass || "Unknown",
      engine: r.EngineModel || "Unknown",
      fuelType: r.FuelTypePrimary || "Unknown",
      color: r.Color || "Not Listed",
      country: r.PlantCountry || "Unknown",
      city: r.PlantCity || "Unknown",
      premium: isPro,
      message: "Basic VIN information retrieved successfully.",
    };

    // BenchLab Pro unlock
    if (isPro) {
      result.message = "Full BenchLab Pro report unlocked.";
      result.ecuImage = `https://vinoautomechanic.com/images/benchlab/ecu-default.jpg`;
      result.wiringDiagram = `https://vinoautomechanic.com/images/benchlab/wiring-default.jpg`;
      result.clusterImage = `https://vinoautomechanic.com/images/benchlab/cluster-default.jpg`;
      result.engineImage = `https://vinoautomechanic.com/images/benchlab/engine-default.jpg`;
      result.carImage = `https://vinoautomechanic.com/images/benchlab/car-default.jpg`;
    }

    res.json(result);
  } catch (error) {
    console.error("VIN decode failed:", error);
    res.status(500).json({ error: "Server error while decoding VIN" });
  }
});


// PDF Generator Route
app.get("/generate-pdf", async (req, res) => {
  try {
    const vin = req.query.vin?.toUpperCase();
    if (!vin) return res.status(400).json({ error: "VIN parameter missing" });

    // Fetch full VIN info with Pro tier
    const api = await fetch(`https://vino-vin-proxy.onrender.com/vin?vin=${vin}&pro=true`);
    const data = await api.json();

    // Initialize PDF
    const doc = new PDFDocument({ margin: 40 });
    const filename = `${vin}_BenchLab_Report.pdf`;
    const filePath = path.join("/tmp", filename);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Theme colors
    const red = "#8B0000";
    const gray = "#1C1C1E";
    const white = "#FFFAFA";

    // 🔴 Header Bar
    doc.rect(0, 0, doc.page.width, 60).fill(red);
    doc.fillColor(white).fontSize(20).text("Vino Auto BenchLab", 40, 20, { continued: true });
    doc.fontSize(10).text("Restoration Pitstop Center", 260, 27);
    doc.moveDown(2);

    // VIN details
    doc.fillColor(gray).fontSize(12).text(`VIN: ${vin}`, { align: "center" });
    doc.moveDown(1);

    // Vehicle Info
    doc.fillColor(gray).fontSize(12);
    const info = [
      `Make: ${data.make}`,
      `Model: ${data.model}`,
      `Year: ${data.year}`,
      `Manufacturer: ${data.manufacturer}`,
      `Color: ${data.color}`,
      `Engine: ${data.engine}`,
      `Fuel Type: ${data.fuelType}`,
      `Country: ${data.country}`,
      `City: ${data.city}`
    ];
    info.forEach(line => doc.text(line));
    doc.moveDown(1.2);

    // Section Title
    doc.fillColor(red).fontSize(14).text("BenchLab Visual Data", { underline: true });
    doc.moveDown(0.8);

    // Image set
    const images = [
      { label: "ECU", url: data.ecuImage },
      { label: "Engine", url: data.engineImage },
      { label: "Cluster", url: data.clusterImage },
      { label: "Wiring Diagram", url: data.wiringDiagram },
      { label: "Car", url: data.carImage }
    ];

    for (const item of images) {
      try {
        const response = await axios.get(item.url, { responseType: "arraybuffer" });
        const imgBuffer = Buffer.from(response.data, "binary");
        doc.fillColor(gray).fontSize(12).text(item.label + ":", { align: "left" });
        doc.image(imgBuffer, { fit: [250, 140], align: "center", valign: "center" });
        doc.moveDown(0.8);
      } catch {
        doc.fillColor(gray).fontSize(11).text(`${item.label}: Image not available`);
        doc.moveDown(0.4);
      }
    }

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor(red)
      .text("Powered by Vino Auto BenchLab Diagnostics", { align: "center" });

    doc.end();

    stream.on("finish", () => {
      res.download(filePath, filename, (err) => {
        if (err) console.error("PDF download error:", err);
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    res.status(500).json({ error: "Server error while generating PDF" });
  }
});

// Fallback route
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚗 Vino VIN Proxy & PDF Server running on port ${PORT}`));
