const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.REDIRECT_URI || 'http://localhost:3000'}/auth/callback`
);

// ==================== OAuth Routes ====================

// 1. แสดง Google Login URL
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

// 2. Handle OAuth Callback
app.post('/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Set credentials
    oauth2Client.setCredentials(tokens);

    // Get user email
    const userInfo = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
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
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// ==================== Document Processing Routes ====================

// 3. สแกนและประมวลผลเอกสาร
app.post('/api/scan-documents', upload.array('files'), async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process documents with Claude API
    const filesInfo = req.files.map(file => ({
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    // Call Anthropic API to analyze documents
    const analysisPrompt = `
สแกนและสรุปข้อมูลจากเอกสารต่อไปนี้ (${req.files.length} ไฟล์):

ชื่อไฟล์:
${filesInfo.map(f => `- ${f.name}`).join('\n')}

โปรดสรุปข้อมูลสำคัญจากเอกสารแต่ละฉบับ รวมถึง:
- ประเภทเอกสาร
- วันที่
- คู่สัญญา/บุคคลที่เกี่ยวข้อง
- จำนวนเงิน (หากมี)
- รายละเอียดสำคัญอื่น ๆ
    `;

    // For now, return file info (Claude processing would go here)
    res.json({
      success: true,
      files: filesInfo,
      summary: 'เอกสารได้รับการสแกนเสร็จแล้ว'
    });

  } catch (error) {
    console.error('Document scanning error:', error);
    res.status(500).json({ error: 'Failed to scan documents', details: error.message });
  }
});

// 4. ส่ง Email พร้อมข้อมูลเอกสาร
app.post('/api/send-email', async (req, res) => {
  try {
    const { 
      refreshToken, 
      recipientEmail, 
      emailSubject, 
      emailMessage,
      documentSummary,
      documentNames
    } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    // Set refresh token and get new access token
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    const accessToken = credentials.access_token;

    // Create Gmail transporter
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Prepare email content
    const emailContent = `
Document Scanner Report
========================

เอกสารที่สแกน:
${documentNames.map(name => `• ${name}`).join('\n')}

สรุปข้อมูล:
${documentSummary}

${emailMessage ? `\nข้อความเพิ่มเติม:\n${emailMessage}` : ''}

---
สร้างโดย Document Scanner App
วันที่: ${new Date().toLocaleString('th-TH')}
    `;

    // Create message
    const message = [
      `From: ${process.env.SENDER_EMAIL || 'noreply@documentscannerapp.com'}`,
      `To: ${recipientEmail}`,
      `Subject: ${emailSubject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      emailContent
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    // Send email via Gmail API
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    res.json({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// ==================== Health Check ====================

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// ==================== Start Server ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Google Client ID: ${process.env.GOOGLE_CLIENT_ID}`);
  console.log(`🔐 OAuth Setup: Ready`);
});
