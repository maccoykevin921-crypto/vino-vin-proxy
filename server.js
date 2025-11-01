// orders-server/index.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

let ORDERS = {}; // { orderId: {paid:true, vin:'...', files:[] } } // persist in a real DB

app.post('/create-order', (req,res)=>{
  // server-side called after payment webhook verifies payment.
  const { orderId, vin } = req.body;
  if(!orderId) return res.status(400).json({error:'Missing orderId'});
  ORDERS[orderId] = { paid: true, vin, created: Date.now(), files:[`${vin}_wiring.pdf`]};
  return res.json({ok:true});
});

// gated download
app.get('/download', (req,res)=>{
  const { file, order } = req.query;
  if(!order || !ORDERS[order] || !ORDERS[order].paid) {
    return res.status(403).json({error:'Payment required to download'});
  }
  // simple path mapping — store files in /files/
  const filePath = path.join(process.cwd(),'files', file);
  if(!fs.existsSync(filePath)) return res.status(404).json({error:'file not found'});
  res.download(filePath, file, (err)=> {
    if(err) console.error('download error', err);
    else console.log(`Order ${order} downloaded file ${file}`);
  });
});

app.get('/', (req,res) => res.send('Orders server online'));
const PORT = process.env.PORT || 11000;
app.listen(PORT, ()=>console.log('Orders server running on', PORT));
