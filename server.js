const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  (process.env.REDIRECT_URI || 'http://localhost:3000') + '/auth/callback'
);

// Home Page with Email Form
app.get('/', (req, res) => {
  const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><title>Document Scanner</title><style>body{font-family:sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}.box{background:white;padding:40px;border-radius:15px;text-align:center;max-width:500px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.2)}h1{color:#333;margin-bottom:10px}p{color:#666;margin-bottom:30px}button{padding:12px 24px;font-size:16px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;width:100%}button:hover{background:#764ba2}button:disabled{opacity:0.6;cursor:not-allowed}.status{margin-top:20px;padding:15px;border-radius:8px;font-size:14px;display:none}.status.show{display:block}.success{background:#d4edda;color:#155724}.error{background:#f8d7da;color:#721c24}.loading{background:#fff3cd;color:#856404}.form-group{margin-bottom:20px;text-align:left}label{display:block;font-weight:600;margin-bottom:8px;color:#333;font-size:14px}input,textarea{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit}input:focus,textarea:focus{outline:none;border-color:#667eea}.user-info{background:#f0f4ff;padding:12px;border-radius:8px;margin-bottom:20px;font-size:13px;text-align:left}.hidden{display:none}.logout{color:#e74c3c;background:none;border:none;font-size:12px;cursor:pointer;text-decoration:underline;padding:0;margin-top:5px;width:auto}</style></head><body><div class=box><h1>📄 Document Scanner</h1><p>สแกนเอกสารและส่งอีเมล</p><div id=loginSection><button id=loginBtn>🔐 ลงชื่อเข้า Google</button></div><div id=appSection class=hidden><div class=user-info>👤 <strong id=userEmail></strong><br><button class=logout id=logoutBtn>ออกจากระบบ</button></div><form id=emailForm><div class=form-group><label>📧 ส่งไปที่ Email</label><input type=email id=recipientEmail value=fesgroup58@gmail.com required></div><div class=form-group><label>✉️ หัวเรื่อง</label><input type=text id=emailSubject value="เอกสารสแกน" required></div><div class=form-group><label>💬 ข้อความ</label><textarea id=emailMessage rows=4 placeholder="ข้อความเพิ่มเติม">เอกสารถูกสแกนเสร็จแล้ว</textarea></div><button type=submit id=sendBtn>📤 ส่งอีเมล</button></form></div><div id=status class=status></div></div><script>const API=window.location.origin;const loginBtn=document.getElementById("loginBtn");const logoutBtn=document.getElementById("logoutBtn");const loginSection=document.getElementById("loginSection");const appSection=document.getElementById("appSection");const emailForm=document.getElementById("emailForm");const userEmail=document.getElementById("userEmail");const status=document.getElementById("status");const sendBtn=document.getElementById("sendBtn");function showStatus(msg,type){status.textContent=msg;status.className="status show "+type;}function checkAuth(){const tokens=localStorage.getItem("userTokens");const userData=localStorage.getItem("userData");if(tokens&&userData){const user=JSON.parse(userData);userEmail.textContent=user.email||"User";loginSection.classList.add("hidden");appSection.classList.remove("hidden");}}loginBtn.onclick=async()=>{try{const r=await fetch(API+"/auth/google-login-url");const d=await r.json();window.location.href=d.authUrl;}catch(e){showStatus("Error: "+e.message,"error");}};logoutBtn.onclick=()=>{localStorage.removeItem("userTokens");localStorage.removeItem("userData");location.reload();};emailForm.onsubmit=async(e)=>{e.preventDefault();const tokens=JSON.parse(localStorage.getItem("userTokens"));sendBtn.disabled=true;showStatus("⏳ กำลังส่ง...","loading");try{const r=await fetch(API+"/api/send-email",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({refreshToken:tokens.refresh_token,recipientEmail:document.getElementById("recipientEmail").value,emailSubject:document.getElementById("emailSubject").value,emailMessage:document.getElementById("emailMessage").value})});const d=await r.json();if(d.success){showStatus("✅ ส่งอีเมลสำเร็จ!","success");}else{showStatus("❌ Error: "+d.error,"error");}}catch(e){showStatus("❌ Error: "+e.message,"error");}finally{sendBtn.disabled=false;}};const url=new URLSearchParams(window.location.search);const code=url.get("code");if(code){showStatus("⏳ กำลังเข้าสู่ระบบ...","loading");fetch(API+"/auth/callback?code="+encodeURIComponent(code)).then(r=>r.json()).then(d=>{if(d.success){localStorage.setItem("userTokens",JSON.stringify(d.tokens));localStorage.setItem("userData",JSON.stringify(d.user));window.history.replaceState({},"","/");checkAuth();showStatus("✅ เข้าสู่ระบบสำเร็จ!","success");}else{showStatus("❌ Login failed","error");}}).catch(e=>showStatus("Error: "+e.message,"error"));}else{checkAuth();}</script></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// OAuth Login URL
app.get('/auth/google-login-url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email'],
    prompt: 'consent'
  });
  res.json({ authUrl });
});

// OAuth Callback (GET)
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'No code' });

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userInfo = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: 'Bearer ' + tokens.access_token } }
    );

    res.json({
      success: true,
      user: { email: userInfo.data.email, name: userInfo.data.name },
      tokens: { access_token: tokens.access_token, refresh_token: tokens.refresh_token }
    });
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(500).json({ error: 'Auth failed: ' + error.message });
  }
});

// Send Email with proper UTF-8 encoding
app.post('/api/send-email', async (req, res) => {
  try {
    const { refreshToken, recipientEmail, emailSubject, emailMessage } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Not authenticated' });

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    await oauth2Client.refreshAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Encode subject for UTF-8
    const encodedSubject = '=?UTF-8?B?' + Buffer.from(emailSubject || 'Document').toString('base64') + '?=';

    const emailBody = (emailMessage || 'Document scanned successfully') + '\n\n' +
      'วันที่: ' + new Date().toLocaleString('th-TH') + '\n\n' +
      '---\nสร้างโดย Document Scanner App';

    const message = [
      'From: noreply@documentscannerapp.com',
      'To: ' + recipientEmail,
      'Subject: ' + encodedSubject,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(emailBody).toString('base64')
    ].join('\r\n');

    const encodedMessage = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('OAuth ready');
  console.log('API: https://web-production-2f611f.up.railway.app');
});
