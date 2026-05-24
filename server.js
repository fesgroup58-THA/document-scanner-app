const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  (process.env.REDIRECT_URI || 'http://localhost:3000') + '/auth/callback'
);

// HTML Page (as string)
const getHtmlPage = () => {
  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document Scanner & Email Sender</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; } .container { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); max-width: 700px; width: 100%; padding: 40px; animation: slideUp 0.6s ease-out; } @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } .header { text-align: center; margin-bottom: 40px; } .icon { font-size: 48px; margin-bottom: 15px; display: block; } h1 { font-size: 28px; color: #333; margin-bottom: 8px; font-weight: 700; } .subtitle { color: #999; font-size: 14px; } .auth-section { text-align: center; margin-bottom: 30px; } .google-login-btn { display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; background: white; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px; transition: all 0.3s ease; } .google-login-btn:hover { border-color: #667eea; box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2); } .form-section { display: none; } .form-section.show { display: block; } .user-info { background: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 13px; display: none; } .user-info.show { display: block; } .user-info-text { color: #333; margin-bottom: 8px; } .form-group { margin-bottom: 25px; } label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px; } input, textarea { width: 100%; padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 14px; font-family: inherit; transition: all 0.3s ease; } input:focus, textarea:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); } button[type="submit"] { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; margin-top: 10px; } button[type="submit"]:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); } button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; } .status { margin-top: 20px; padding: 15px; border-radius: 10px; font-size: 14px; display: none; } .status.show { display: block; animation: slideUp 0.3s ease-out; } .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; } .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }</style></head><body><div class="container"><div class="header"><span class="icon">📄</span><h1>Document Scanner</h1><p class="subtitle">สแกนเอกสารและส่งอีเมลอัตโนมัติ</p></div><div class="user-info" id="userInfo"><div class="user-info-text">👤 <strong id="userName"></strong> (<span id="userEmail"></span>)</div><button class="logout-btn" id="logoutBtn" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-weight: 600; font-size: 12px; text-decoration: underline;">ออกจากระบบ</button></div><div class="auth-section" id="authSection"><button class="google-login-btn" id="googleLoginBtn">📧 ลงชื่อเข้าด้วย Google</button></div><form id="scannerForm" class="form-section"><div class="form-group"><label>🎯 ที่อยู่อีเมลปลายทาง</label><input type="email" id="recipientEmail" placeholder="example@gmail.com" value="fesgroup58@gmail.com" required></div><div class="form-group"><label>✉️ หัวเรื่อง</label><input type="text" id="emailSubject" placeholder="เช่น: เอกสารใบสั่งซื้อ" value="เอกสารสแกน" required></div><div class="form-group"><label>📤 ส่ง</label><button type="submit" id="submitBtn">ส่งอีเมล</button><div id="status" class="status"></div></div></form></div><script>const API_BASE_URL = window.location.origin; const authSection = document.getElementById("authSection"); const userInfo = document.getElementById("userInfo"); const googleLoginBtn = document.getElementById("googleLoginBtn"); const logoutBtn = document.getElementById("logoutBtn"); const scannerForm = document.getElementById("scannerForm"); const status = document.getElementById("status"); const submitBtn = document.getElementById("submitBtn"); let userTokens = null; googleLoginBtn.addEventListener("click", async () => { try { const response = await fetch(API_BASE_URL + "/auth/google-login-url"); const data = await response.json(); window.location.href = data.authUrl; } catch (error) { showStatus("Error: " + error.message, "error"); } }); window.addEventListener("load", async () => { const urlParams = new URLSearchParams(window.location.search); const code = urlParams.get("code"); if (code) { try { showStatus("Loading...", "status"); const response = await fetch(API_BASE_URL + "/auth/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); const data = await response.json(); if (data.success) { userTokens = data.tokens; localStorage.setItem("userTokens", JSON.stringify(userTokens)); document.getElementById("userName").textContent = data.user.name || "User"; document.getElementById("userEmail").textContent = data.user.email; authSection.style.display = "none"; userInfo.classList.add("show"); scannerForm.classList.add("show"); status.classList.remove("show"); window.history.replaceState({}, document.title, window.location.pathname); showStatus("Login successful!", "success"); } else { showStatus("Login failed", "error"); } } catch (error) { showStatus("Error: " + error.message, "error"); } } const savedTokens = localStorage.getItem("userTokens"); if (savedTokens && !code) { userTokens = JSON.parse(savedTokens); authSection.style.display = "none"; userInfo.classList.add("show"); scannerForm.classList.add("show"); document.getElementById("userName").textContent = "User"; } }); logoutBtn.addEventListener("click", () => { localStorage.removeItem("userTokens"); userTokens = null; authSection.style.display = "block"; userInfo.classList.remove("show"); scannerForm.classList.remove("show"); showStatus("Logged out", "success"); }); scannerForm.addEventListener("submit", async (e) => { e.preventDefault(); if (!userTokens) { showStatus("Please login first", "error"); return; } const recipientEmail = document.getElementById("recipientEmail").value; const emailSubject = document.getElementById("emailSubject").value; submitBtn.disabled = true; showStatus("Sending...", "status"); try { const response = await fetch(API_BASE_URL + "/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: userTokens.refresh_token, recipientEmail: recipientEmail, emailSubject: emailSubject, documentSummary: "Document scanned successfully" }) }); const result = await response.json(); if (result.success) { showStatus("Email sent successfully!", "success"); } else { showStatus("Error: " + result.error, "error"); } } catch (error) { showStatus("Error: " + error.message, "error"); } finally { submitBtn.disabled = false; } }); function showStatus(message, type) { status.textContent = message; status.className = "status show " + type; } </script></body></html>';
};

// Routes

// Home
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getHtmlPage());
});

// Google Login URL
app.get('/auth/google-login-url', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.json({ authUrl });
});

// OAuth Callback
app.post('/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'No code' });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userInfo = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: 'Bearer ' + tokens.access_token } }
    );

    res.json({
      success: true,
      user: {
        email: userInfo.data.email,
        name: userInfo.data.name
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      }
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Auth failed' });
  }
});

// Send Email
app.post('/api/send-email', async (req, res) => {
  try {
    const { refreshToken, recipientEmail, emailSubject, documentSummary } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Not authenticated' });
    }

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const emailContent = 'Document Scanner Report\n\n' +
      'Summary: ' + documentSummary + '\n\n' +
      'Date: ' + new Date().toLocaleString('th-TH');

    const message = 'From: noreply@documentscannerapp.com\n' +
      'To: ' + recipientEmail + '\n' +
      'Subject: ' + emailSubject + '\n' +
      'Content-Type: text/plain; charset=utf-8\n\n' +
      emailContent;

    const encodedMessage = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('Google OAuth ready');
});
