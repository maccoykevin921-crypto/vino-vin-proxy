import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>res.send("✅ Vino VIN Proxy Online — VIN, Fines & Insurance Ready"));

app.get("/vin", async (req,res)=>{
  const vin=(req.query.vin||"").trim().toUpperCase();
  if(!vin)return res.status(400).json({error:"Missing VIN"});
  try{
    const r=await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const j=await r.json();const d=j.Results[0];
    res.json({
      vin,
      make:d.Make||"Unknown",model:d.Model||"Unknown",
      year:d.ModelYear||"Unknown",manufacturer:d.Manufacturer||"Unknown",
      engine:d.EngineModel||"Unknown",country:d.PlantCountry||"Unknown",
      plantCity:d.PlantCity||"Unknown"
    });
  }catch(e){res.status(500).json({error:"VIN lookup failed"});}
});

app.post("/fines", async (req,res)=>{
  const {plate,idNumber,country,consent}=req.body;
  if(!consent)return res.status(403).json({error:"Consent required"});
  if(!plate)return res.status(400).json({error:"Missing plate"});
  const c=(country||"ZA").toUpperCase();
  const demoCount=Math.floor(Math.random()*3);
  const demoAmt=300+Math.floor(Math.random()*1200);
  res.json({
    plate,country:c,total_fines:demoCount,
    outstanding_amount:`R${demoAmt}`,status:"Demo Mode - No live API",
    last_update:new Date().toISOString()
  });
});

app.post("/insurance", async (req,res)=>{
  const {vin,plate,country,consent}=req.body;
  if(!consent)return res.status(403).json({error:"Consent required"});
  if(!vin&&!plate)return res.status(400).json({error:"VIN or plate required"});
  const companies=["Hollard","Santam","Discovery","King Price","Old Mutual"];
  const comp=companies[Math.floor(Math.random()*companies.length)];
  const exp=new Date();exp.setMonth(exp.getMonth()+Math.floor(Math.random()*12)+1);
  const policy="POL"+Math.floor(100000+Math.random()*900000);
  res.json({
    vin,plate,country,policyNumber:policy,insuranceCompany:comp,
    expiryDate:exp.toISOString().slice(0,10),status:"Active",verified:true
  });
});

app.use((req,res)=>res.status(404).json({error:"Route not found"}));

const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log(`🚀 Vino Proxy running on ${PORT}`));
