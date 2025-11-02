// server.js
// VIN + Insurance + Parts + Fines + Events + Chat proxy
// Run: node server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIG: set these in Render environment variables ---
const VIN_API = process.env.VIN_API || "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVIN/";
const RAPID_API_KEY = process.env.RAPID_API_KEY || ""; // insurance/parts providers (if used)
const INSURANCE_API = process.env.INSURANCE_API || ""; // placeholder
const PARTS_API = process.env.PARTS_API || ""; // placeholder
const FINES_API = process.env.FINES_API || ""; // placeholder
const EVENTS_API_KEY = process.env.EVENTS_API_KEY || ""; // placeholder for holiday service

// --- simple audit log for all lookups ---
const auditFile = path.join(process.cwd(), "vin_lookup_audit.log");
function auditLog(entry) {
  const line = `${new Date().toISOString()} ${JSON.stringify(entry)}\n`;
  fs.appendFile(auditFile, line, (err) => { if (err) console.error("Audit write fail", err); });
}

// --- root quick health check ---
app.get("/", (req, res) => {
  res.send("Vino VIN Proxy - online");
});

// --- VIN lookup endpoint (existing VIN behavior improved) ---
// GET /vin?vin=XXXX
app.get("/vin", async (req, res) => {
  const vin = (req.query.vin || "").trim();
  const clientIp = req.ip;
  const userAgent = req.headers["user-agent"] || "";
  if (!vin) return res.status(400).json({ error: "VIN missing" });

  // log request for consent/audit
  auditLog({ op: "vin_lookup_request", vin, ip: clientIp, ua: userAgent });

  try {
    // call NHTSA (example) - format=json
    const url = `${VIN_API}${encodeURIComponent(vin)}?format=json`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.Results || !data.Results[0]) {
      auditLog({ op: "vin_no_data", vin });
      return res.status(404).json({ error: "No data found for this VIN" });
    }

    const r = data.Results[0];

    // build response - standardized fields
    const result = {
      vin,
      make: r.Make || "N/A",
      model: r.Model || "N/A",
      year: r.ModelYear || "N/A",
      manufacturer: r.Manufacturer || "N/A",
      engine: r.EngineModel || r.Engine || "N/A",
      cylinders: r.EngineCylinders || "N/A",
      plant: r.PlantCity || "N/A"
    };

    // audit success
    auditLog({ op: "vin_lookup_success", vin, result });

    res.json(result);
  } catch (err) {
    console.error("VIN lookup failed:", err);
    auditLog({ op: "vin_lookup_failed", vin, error: err.message });
    res.status(500).json({ error: "VIN lookup failed", details: err.message });
  }
});

// --- Insurance lookup ---
// GET /insurance?vin=XXXX or ?reg=PLATE
app.get("/insurance", async (req, res) => {
  const vin = (req.query.vin || "").trim();
  const reg = (req.query.reg || "").trim();
  if (!vin && !reg) return res.status(400).json({ error: "VIN or reg required" });

  // audit
  auditLog({ op: "insurance_request", vin, reg, ip: req.ip });

  try {
    // Placeholder behavior: if INSURANCE_API set, call it; otherwise return simulated response.
    if (INSURANCE_API) {
      // Example fetch using RAPID key
      const url = `${INSURANCE_API}?vin=${encodeURIComponent(vin)}&reg=${encodeURIComponent(reg)}`;
      const r = await fetch(url, { headers: { "x-api-key": RAPID_API_KEY } });
      const j = await r.json();
      auditLog({ op: "insurance_api_success", vin, reg });
      return res.json(j);
    }

    // Simulated response if no external API configured
    const simulated = {
      vin: vin || "N/A",
      reg: reg || "N/A",
      insured: Math.random() > 0.35, // truthy/falsey random
      insurer: "Vino Assurance (demo)",
      policyNumber: "DEMO-" + Math.random().toString(36).slice(2,10).toUpperCase(),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * (30 + Math.floor(Math.random()*300))).toISOString()
    };
    auditLog({ op: "insurance_simulated", vin, reg, simulated });
    return res.json(simulated);
  } catch (err) {
    console.error(err);
    auditLog({ op: "insurance_error", vin, reg, error: err.message });
    return res.status(500).json({ error: "Insurance lookup failed", details: err.message });
  }
});

// --- Parts lookup ---
// GET /parts?q=alternator+vw+polo&country=KE
app.get("/parts", async (req, res) => {
  const q = (req.query.q || "").trim();
  const country = (req.query.country || "SA").toUpperCase();
  if (!q) return res.status(400).json({ error: "Query required" });

  auditLog({ op: "parts_request", q, country, ip: req.ip });

  try {
    // If PARTS_API exists, call it; else simulate local partner results
    if (PARTS_API) {
      const url = `${PARTS_API}?q=${encodeURIComponent(q)}&country=${encodeURIComponent(country)}`;
      const r = await fetch(url, { headers: { "x-api-key": RAPID_API_KEY } });
      const j = await r.json();
      auditLog({ op: "parts_api_success", q, country });
      return res.json(j);
    }

    // Simulated partner list
    const partners = [
      { name: "Vino Parts - " + country, country, phone: "+000000", url: "https://example.com/parts/" + encodeURIComponent(q), price: "estimate", stock: "In stock" },
      { name: "Local Garage Supplies", country, phone: "+000000", url: "https://example.com/local/" + encodeURIComponent(q), price: "estimate", stock: "Limited" }
    ];
    auditLog({ op: "parts_simulated", q, country, partners });
    res.json({ query: q, country, results: partners });
  } catch (err) {
    console.error(err);
    auditLog({ op: "parts_error", q, country, error: err.message });
    res.status(500).json({ error: "Parts lookup failed", details: err.message });
  }
});

// --- Traffic fines lookup (owner consent required) ---
// GET /fines?reg=ABC123&country=KE
app.get("/fines", async (req, res) => {
  const reg = (req.query.reg || "").trim();
  const country = (req.query.country || "ZA").toUpperCase();
  if (!reg) return res.status(400).json({ error: "Registration / plate required" });

  // audit with note: owner consent must be presented on frontend
  auditLog({ op: "fines_request", reg, country, ip: req.ip });

  try {
    if (FINES_API) {
      const url = `${FINES_API}?reg=${encodeURIComponent(reg)}&country=${encodeURIComponent(country)}`;
      const r = await fetch(url, { headers: { "x-api-key": RAPID_API_KEY } });
      const j = await r.json();
      auditLog({ op: "fines_api_success", reg, country });
      return res.json(j);
    }

    // Simulated fines response
    const simulated = {
      reg,
      country,
      fines: (Math.random() > 0.7) ? [
        { id: "F" + Math.floor(Math.random()*100000), amount: (50 + Math.floor(Math.random()*500)), date: new Date(Date.now()-1000*60*60*24*(Math.floor(Math.random()*365))).toISOString(), reason: "Speeding" }
      ] : []
    };
    auditLog({ op: "fines_simulated", reg, country, simulated });
    res.json(simulated);
  } catch (err) {
    console.error(err);
    auditLog({ op: "fines_error", reg, country, error: err.message });
    res.status(500).json({ error: "Fines lookup failed", details: err.message });
  }
});

// --- Events / Holidays sync (multi-country) ---
// GET /events?country=KE
app.get("/events", async (req, res) => {
  const country = (req.query.country || "ZA").toUpperCase();

  auditLog({ op: "events_request", country, ip: req.ip });

  try {
    // If you have a holidays API, plug here. For now simulate widely-known holidays.
    if (EVENTS_API_KEY) {
      // Example fetch to a holiday API (implement if you have one)
      // const url = `${EVENTS_API}?country=${country}&year=${new Date().getFullYear()}`;
      // const r = await fetch(url, { headers: { "x-api-key": EVENTS_API_KEY }});
      // const j = await r.json();
      // return res.json(j);
    }

    // Simulated important dates (only a few)
    const common = {
      ZA: [
        { name: "Freedom Day", date: `${new Date().getFullYear()}-04-27`, type: "public" },
        { name: "Christmas", date: `${new Date().getFullYear()}-12-25`, type: "religious" }
      ],
      KE: [
        { name: "Jamhuri Day", date: `${new Date().getFullYear()}-12-12`, type: "public" },
        { name: "Mashujaa Day", date: `${new Date().getFullYear()}-10-20`, type: "public" }
      ],
      TZ: [
        { name: "Union Day", date: `${new Date().getFullYear()}-04-26`, type: "public" },
        { name: "Independence Day", date: `${new Date().getFullYear()}-12-09`, type: "public" }
      ],
      UG: [
        { name: "Independence Day", date: `${new Date().getFullYear()}-10-09`, type: "public" },
        { name: "Christmas", date: `${new Date().getFullYear()}-12-25`, type: "religious" }
      ],
      US: [
        { name: "Independence Day", date: `${new Date().getFullYear()}-07-04`, type: "public" },
        { name: "Thanksgiving", date: `${new Date().getFullYear()}-11-27`, type: "public" }
      ]
    };

    const events = common[country] || common["ZA"];
    auditLog({ op: "events_simulated", country, events });
    res.json({ country, events });
  } catch (err) {
    console.error(err);
    auditLog({ op: "events_error", country, error: err.message });
    res.status(500).json({ error: "Events lookup failed", details: err.message });
  }
});

// --- Simple chat endpoint (stateless question/answer with VIN context) ---
// POST /chat  { vin:"", question:"..." }
// Returns a structured advice response (simulate)
app.post("/chat", async (req, res) => {
  const { vin = "", question = "" } = req.body || {};
  if (!question) return res.status(400).json({ error: "Question required" });

  auditLog({ op: "chat_request", vin, question, ip: req.ip });

  try {
    // Example: integrate with an LLM if you have backend access (not included here)
    // For demo/safety, return a templated answer using VIN details if possible.
    let vinInfo = {};
    if (vin) {
      // call VIN endpoint internally
      const url = `${VIN_API}${encodeURIComponent(vin)}?format=json`;
      try {
        const r = await fetch(url);
        const d = await r.json();
        if (d && d.Results && d.Results[0]) {
          const r0 = d.Results[0];
          vinInfo = { make: r0.Make, model: r0.Model, year: r0.ModelYear };
        }
      } catch(e) { /* ignore */ }
    }

    // Simple heuristic response
    const advice = `Based on your question: "${question}".` +
      (vinInfo.make ? ` Vehicle: ${vinInfo.make} ${vinInfo.model} (${vinInfo.year}).` : "") +
      ` Common checks: battery/ground connections, spark/coil packs, and error code read. If you want guided diagnostics, run the vehicle scan and attach DTCs.`;

    auditLog({ op: "chat_response", vin, question, adviceSnippet: advice.slice(0,200) });

    res.json({ vin, answer: advice });
  } catch (err) {
    console.error(err);
    auditLog({ op: "chat_error", vin, question, error: err.message });
    res.status(500).json({ error: "Chat failed", details: err.message });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Vino Proxy running on ${PORT}`));
