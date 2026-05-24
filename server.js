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

// Simple HTML Home Page
app.get('/', (req, res) => {
  const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><title>Document Scanner</title><style>body{font-family:sans-serif;background:#667eea;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.box{background:white;padding:40px;border-radius:10px;text-align:center;max-width:500px}h1{color:#333}button{padding:12px 24px;font-size:16px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer}button:hover{background:#764ba2}.status{margin-top:20px;padding:15px;border-radius:5px}.success{background:#d4edda;color:#155724}.error{background:#f8d7da;color:#721c24}</style></head><body><div class=box><h1>📄 Document Scanner</h1><p>สแกนเอกสารและส่งอีเมล</p><button id=loginBtn>ลงชื่อเข้า Google</button><div id=status></div></div><script>const API=window.location.origin;document.getElementById("loginBtn").onclick=async()=>{try{const r=await fetch(API+"/auth/google-login-url");const d=await r.json();window.location.href=d.authUrl}catch(e){alert(e.message)}};const url=new URLSearchParams(window.location.search);const code=url.get("code");if(code){(async()=>{try{const r=await fetch(API+"/auth/callback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});const d=await r.json();if(d.success){alert("Login OK!");window.history.replaceState({},"","/");window.location.href="/"}else alert("Login failed: "+d.error)}catch(e){alert("Error: "+e.message)}})()}</script></body></html>';
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

// OAuth Callback
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

// Send Email
app.post('/api/send-email', async (req, res) => {
  try {
    const { refreshToken, recipientEmail, emailSubject } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Not authenticated' });

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = 'From: noreply@documentscannerapp.com\nTo: ' + recipientEmail + '\nSubject: ' + emailSubject + '\nContent-Type: text/plain; charset=utf-8\n\nDocument scanned successfully!\nDate: ' + new Date().toLocaleString('th-TH');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

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
  console.log('API: https://web-production-2f61f1.up.railway.app');
});
