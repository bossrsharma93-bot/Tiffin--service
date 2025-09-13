
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';

const app = express();

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

app.use(helmet());
app.set('trust proxy', 1);
const limiter = rateLimit({windowMs: 15*60*1000, max: 300});
app.use(limiter);
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'
}));
app.use(express.json());

const db = new Low(new JSONFile('./data/db.json'), { orders: [], menu: {}, config: {} });
await db.read();
db.data ||= { orders: [], menu: {}, config: {} };

// Load shared config
import fs from 'fs';
const sharedConfig = JSON.parse(fs.readFileSync('../sharma-config.json','utf-8'));
db.data.menu = { pricing: sharedConfig.pricing };
db.data.config = { delivery: sharedConfig.delivery, upiId: process.env.UPI_ID || sharedConfig.upiId, businessName: process.env.BUSINESS_NAME || sharedConfig.businessName };

// Helpers
const priceForType = (type) => {
  const p = db.data.menu.pricing;
  switch(type){
    case 'daily': return p.dailyMeal;
    case 'breakfast': return p.breakfast;
    case 'monthlyVeg': return p.monthlyVeg;
    case 'monthlyNonVeg': return p.monthlyNonVeg;
    default: return 0;
  }
};

const deliveryFeeForKm = (km) => {
  const slabs = db.data.config.delivery.slabs;
  for(const s of slabs){
    if(km <= s.maxKm) return s.fee;
  }
  return slabs[slabs.length-1].fee;
};

const upiUrl = ({payeeVpa, payeeName, amount, note}) => {
  // UPI deep link
  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName || 'Sharma Tiffin',
    am: String(amount),
    cu: 'INR',
    tn: note || 'Tiffin order'
  });
  return `upi://pay?${params.toString()}`;
};

// Routes
app.get('/', (req,res)=> res.json({ ok:true, name: db.data.config.businessName }));

app.get('/menu', async (req,res)=>{
  res.json(db.data.menu);
});

app.get('/delivery/fee', async (req,res)=>{
  const km = Math.max(0, parseFloat(req.query.km||'0'));
  const fee = deliveryFeeForKm(km);
  res.json({ km, fee });
});

app.post('/orders', async (req,res)=>{
  const { mobile, type, qty=1, distanceKm=0, note='' } = req.body;
  const unitPrice = priceForType(type);
  const deliveryFee = deliveryFeeForKm(distanceKm);
  const amount = unitPrice * qty + deliveryFee;
  const order = {
    id: nanoid(8),
    createdAt: new Date().toISOString(),
    mobile, type, qty, distanceKm, note,
    unitPrice, deliveryFee, amount,
    status: 'pending_payment'
  };
  db.data.orders.unshift(order);
  await db.write();

  const payUrl = upiUrl({ payeeVpa: db.data.config.upiId, payeeName: db.data.config.businessName, amount, note: `Order ${order.id}` });
  res.json({ ok:true, order, payment: { upiUrl: payUrl, amount } });
});

// Admin
app.post('/admin/login', (req,res)=>{
  const ok = (req.body.pin || '') === (process.env.ADMIN_PIN || '1234');
  res.json({ ok });
});

app.get('/admin/orders', async (req,res)=>{
  res.json(db.data.orders);
});

app.post('/admin/orders/:id/status', async (req,res)=>{
  const id = req.params.id;
  const { status } = req.body;
  const o = db.data.orders.find(x=>x.id===id);
  if(!o) return res.status(404).json({ ok:false, error:'not_found' });
  o.status = status;
  await db.write();
  res.json({ ok:true });
});



/**
 * PAYMENT: Create Razorpay Payment Link
 * - Requires env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 * - Creates a payment link for a given order payload and returns { ok, url }
 * - If credentials are missing, returns helpful error so dev can follow README.
 */
import fetch from 'node-fetch'; // lightweight fetch for creating payment links

app.post('/payments/create_link', async (req, res) => {
  const { amount, customer, description } = req.body || {};
  if (!amount || !customer || !customer.name || !customer.phone) {
    return res.status(400).json({ ok:false, error: 'missing_parameters', message: 'Provide amount and customer {name, phone}' });
  }
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) {
    return res.status(500).json({ ok:false, error:'no_credentials', message: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env' });
  }

  try {
    const body = {
      amount: Number(amount) * 100, // INR paise
      currency: 'INR',
      accept_partial: false,
      reference_id: `order_${Date.now()}`,
      description: description || 'Sharma Tiffin Order',
      customer: {
        name: customer.name,
        contact: customer.phone,
        email: customer.email || ''
      },
      notify: { sms: true, email: true },
      callback_url: `${req.protocol}://${req.get('host')}/payments/webhook`,
      callback_method: 'get'
    };

    const resp = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
      },
      body: JSON.stringify(body)
    });
    const j = await resp.json();
    if (resp.status >= 400) {
      return res.status(resp.status).json({ ok:false, error:'razorpay_error', detail: j });
    }
    return res.json({ ok:true, url: j.short_url, raw: j });
  } catch (e) {
    console.error('create_link_err', e);
    return res.status(500).json({ ok:false, error:'server_error', message: e.message });
  }
});

/**
 * Simple Admin UI (static) - lists orders and allows status update (calls existing admin endpoint)
 */
app.get('/admin', async (req, res) => {
  await db.read();
  const html = `
  <!doctype html><html><head><meta charset="utf-8"><title>Sharma Tiffin Admin</title>
  <style>body{font-family:Arial;margin:20px} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:8px} th{background:#f4f4f4}</style>
  </head><body>
  <h2>Admin - Orders</h2>
  <table><thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Items</th><th>Status</th><th>Action</th></tr></thead><tbody>
  ${db.data.orders.map(o=>`<tr><td>${o.id}</td><td>${o.customer?.name||''}</td><td>${o.customer?.phone||''}</td><td>${(o.items||[]).map(i=>i.title).join(', ')}</td><td>${o.status||''}</td><td><button onclick="update('${o.id}','preparing')">Preparing</button> <button onclick="update('${o.id}','out_for_delivery')">Out for delivery</button> <button onclick="update('${o.id}','delivered')">Delivered</button></td></tr>`).join('')}
  </tbody></table>
  <script>
    async function update(id,status){
      const pin = prompt('Enter admin pin');
      if(!pin) return;
      const res = await fetch('/admin/orders/'+id+'/status', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status, pin})});
      const j = await res.json();
      alert(JSON.stringify(j));
      if(j.ok) location.reload();
    }
  </script>
  </body></html>
  `;
  res.set('Content-Type','text/html').send(html);
});


// Health & readiness
app.get('/health', (req,res)=>res.json({ ok:true, status:'up' }));

// Razorpay Payment Link callback (GET) and Webhook (POST)
// Note: For Payment Links callback, Razorpay sends query params including razorpay_payment_id, razorpay_payment_link_id, razorpay_signature
app.get('/payments/webhook', async (req,res)=>{
  const { razorpay_payment_id, razorpay_payment_link_id, razorpay_order_id, razorpay_signature, orderId } = req.query;
  try{
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if(!secret) return res.status(500).send('Missing RAZORPAY_KEY_SECRET');

    // Build possible payloads based on what was used: order or payment link
    const possible = [];
    if(razorpay_payment_link_id && razorpay_payment_id){
      possible.push(`${razorpay_payment_link_id}|${razorpay_payment_id}`);
    }
    if(razorpay_order_id && razorpay_payment_id){
      possible.push(`${razorpay_order_id}|${razorpay_payment_id}`);
    }

    let verified = false;
    for(const base of possible){
      const h = crypto.createHmac('sha256', secret).update(base).digest('hex');
      if(h === razorpay_signature){ verified = true; break; }
    }
    if(!verified){
      return res.status(400).send('Signature verification failed');
    }

    // Mark order as paid if present
    await db.read();
    if(orderId){
      const o = db.data.orders.find(x=>x.id===orderId);
      if(o){ o.status = 'paid'; o.payment = { razorpay_payment_id, verified:true, at: new Date().toISOString() }; await db.write(); }
    }
    return res.send('OK');
  }catch(e){
    console.error('webhook_err', e);
    return res.status(500).send('Server error');
  }
});

// Raw webhook for events (configure Razorpay dashboard). Provide header x-razorpay-signature
app.post('/payments/razorpay-webhook', express.raw({type:'application/json'}), async (req,res)=>{
  try{
    const signature = req.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if(!secret) return res.status(500).send('Missing webhook secret');
    const payload = req.body; // Buffer due to raw()
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if(expected !== signature){ return res.status(400).send('Bad signature'); }

    // naive handler: if event contains an order/notes.orderId mark paid
    const data = JSON.parse(payload.toString('utf-8'));
    const notesOrderId = data?.payload?.payment?.entity?.notes?.orderId;
    if(notesOrderId){
      await db.read();
      const o = db.data.orders.find(x=>x.id===notesOrderId);
      if(o){ o.status='paid'; o.payment={ event:data.event, verified:true, at:new Date().toISOString() }; await db.write(); }
    }
    res.send('OK');
  }catch(e){
    console.error('rp_webhook_err', e);
    res.status(500).send('Server error');
  }
});


app.listen(process.env.PORT || 4000, ()=>{
  console.log('API listening on', process.env.PORT || 4000);
});
