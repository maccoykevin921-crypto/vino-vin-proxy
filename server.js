// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const PRO_KEY = process.env.PRO_KEY || "benchlab-PRO-KEY-218x9-VINO";
const API_ROOT = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/";

// Simple JSON persistence (orders). For production use a DB.
const ORDERS_FILE = "./orders.json";
function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE)); } catch(e){ return {}; }
}
function writeOrders(o){ fs.writeFileSync(ORDERS_FILE, JSON.stringify(o, null, 2)); }

// Helpers
function genId(prefix="ord"){ return prefix + "-" + crypto.randomBytes(6).toString("hex"); }
function genToken(){ return crypto.randomBytes(12).toString("hex"); }

// Root
app.get("/", (req,res) => res.send("✅ Vino VIN Proxy + Payments running"));

// VIN basic
app.get("/vin", async (req,res) => {
  try {
    const vin = (req.query.vin || "").toString().trim().toUpperCase();
    if (!vin) return res.status(400).json({ error: "Missing VIN" });
    const j = await (await fetch(`${API_ROOT}${encodeURIComponent(vin)}?format=json`)).json();
    const r = j.Results && j.Results[0] ? j.Results[0] : {};
    const out = {
      vin,
      make: r.Make || "Unknown",
      model: r.Model || "Unknown",
      year: r.ModelYear || "Unknown",
      manufacturer: r.Manufacturer || "Unknown",
      engine: r.EngineModel || "Unknown",
      fuelType: r.FuelTypePrimary || "Unknown",
      color: r.Color || "Not Listed",
      country: r.PlantCountry || "Unknown",
      city: r.PlantCity || "Unknown",
      message: "Preview available"
    };
    res.json(out);
  } catch (err) {
    console.error("VIN error:", err);
    res.status(500).json({ error: "VIN server error" });
  }
});

/*
  Order flow:
  POST /start-payment
    body: { vin, customerName, phone, email, amount, method }
  returns: { orderId, payment_url, order }
*/
app.post("/start-payment", (req,res) => {
  try {
    const { vin, customerName, phone, email, amount } = req.body;
    if (!vin || !phone) return res.status(400).json({ error: "vin and phone required" });

    const orders = readOrders();
    const orderId = genId();
    const order = {
      id: orderId,
      vin: vin.toUpperCase(),
      customerName: customerName || null,
      phone: phone.replace(/\D/g,""),
      email: email || null,
      amount: amount || 1000,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    // Two options:
    // 1) Auto payment provider integration (left as webhook-ready)
    // 2) Manual wa.me payment (cash/EFT) — we provide wa.me link prefilled with message
    const waMsg = encodeURIComponent(`Hello Vino, I paid for BenchLab Pro for VIN ${order.vin}. Order: ${orderId}. Please send the download link.`);
    order.payment_url = `https://wa.me/${order.phone}?text=${waMsg}`; // opens WhatsApp for manual flow

    orders[orderId] = order;
    writeOrders(orders);

    res.json({ orderId, payment_url: order.payment_url, order });
  } catch (err) {
    console.error("start-payment error:", err);
    res.status(500).json({ error: "start-payment failed" });
  }
});

/*
  Payment webhook (used by payment provider). Example provider will POST { orderId, status, providerRef }
  For manual flow, admin will mark orders paid via admin call (below).
*/
app.post("/payment-webhook", (req,res) => {
  try {
    const { orderId, status, providerRef } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const orders = readOrders();
    const order = orders[orderId];
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Example status: "PAID"
    if (status === "PAID" || status === "SUCCESS") {
      order.status = "paid";
      order.paidAt = new Date().toISOString();
      order.providerRef = providerRef || null;

      // generate one-time token and secure link
      const token = genToken();
      order.token = token;
      order.tokenExpires = Date.now() + (1000 * 60 * 60); // 1 hour expiry

      // secure download link for client
      order.download_link = `${getBaseUrl(req)}/download?token=${token}`;

      orders[orderId] = order;
      writeOrders(orders);

      // Optionally: call your admin notification here (email or webhook) - not implemented
      console.log("Order paid:", orderId);

      return res.json({ ok: true });
    } else {
      order.status = status || "failed";
      orders[orderId] = order;
      writeOrders(orders);
      return res.json({ ok: true });
    }
  } catch (err) {
    console.error("webhook error:", err);
    res.status(500).json({ error: "webhook processing failed" });
  }
});

// Admin helper to mark paid manually (protected by a simple secret in PRO_KEY for admin convenience)
app.post("/admin/mark-paid", (req,res) => {
  try {
    const { orderId, adminKey } = req.body;
    if (adminKey !== PRO_KEY) return res.status(401).json({ error: "unauthorized" });
    const orders = readOrders();
    const order = orders[orderId];
    if (!order) return res.status(404).json({ error: "not found" });

    order.status = "paid";
    order.paidAt = new Date().toISOString();
    order.token = genToken();
    order.tokenExpires = Date.now() + (1000*60*60);
    order.download_link = `${getBaseUrl(req)}/download?token=${order.token}`;

    orders[orderId] = order;
    writeOrders(orders);
    writeOrders(orders);
    res.json({ ok:true, order });
  } catch(e) { res.status(500).json({error:"failed"}); }
});

// order status
app.get("/order-status", (req,res) => {
  const orderId = req.query.orderId;
  if (!orderId) return res.status(400).json({ error: "orderId required" });
  const orders = readOrders();
  const order = orders[orderId];
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
});

// download by token (one-time)
app.get("/download", async (req,res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: "token required" });

    const orders = readOrders();
    const order = Object.values(orders).find(o => o.token === token);
    if (!order) return res.status(404).json({ error: "Invalid token" });
    if (Date.now() > order.tokenExpires) return res.status(410).json({ error: "Token expired" });

    // Invalidate token immediately (one-time)
    order.token = null;
    order.tokenExpires = 0;
    orders[order.id] = order;
    writeOrders(orders);

    // Generate PDF report for VIN and stream it
    const vin = order.vin;
    const filename = `${vin}_BenchLab_Report.pdf`;
    const filepath = path.join("/tmp", filename);
    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(18).fillColor("#8B0000").text("Vino Auto BenchLab - Pro Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).fillColor("#000").text(`VIN: ${vin}`);
    doc.text(`Make: ${order.make || "-"}`);
    doc.text(`Model: ${order.model || "-"}`);
    doc.text(`Paid for order: ${order.id}`);
    doc.end();

    stream.on("finish", () => {
      res.download(filepath, filename, (err) => { try{ fs.unlinkSync(filepath);}catch(e){} });
    });
  } catch (err) {
    console.error("download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// helper to build absolute base url
function getBaseUrl(req){
  return (req.headers['x-forwarded-proto'] || req.protocol) + "://" + req.headers.host;
}

app.listen(PORT, ()=> console.log(`Vino VIN + Payments listening on ${PORT}`));
