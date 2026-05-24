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

// Fixed recipient email
const FIXED_RECIPIENT = 'fesgroup58@gmail.com';

// Home Page - Public, no login required
app.get('/', (req, res) => {
  const hasToken = !!process.env.SYSTEM_REFRESH_TOKEN;
  const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Document Scanner</title><style>body{font-family:sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;justify-content:center;align-items:flex-start;min-height:100vh;margin:0;padding:20px}.box{background:white;padding:30px;border-radius:15px;text-align:center;max-width:600px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.2)}h1{color:#333;margin-bottom:8px}.subtitle{color:#666;margin-bottom:20px;font-size:14px}.target-email{background:#e8f5e9;padding:12px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#2e7d32;border-left:4px solid #4caf50}button{padding:12px 24px;font-size:16px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;width:100%}button:hover{background:#764ba2}button:disabled{opacity:0.6;cursor:not-allowed}.btn-secondary{background:#48bb78}.btn-secondary:hover{background:#38a169}.btn-camera{background:#ed8936}.btn-camera:hover{background:#dd6b20}.status{margin-top:20px;padding:15px;border-radius:8px;font-size:14px;display:none}.status.show{display:block}.success{background:#d4edda;color:#155724}.error{background:#f8d7da;color:#721c24}.loading{background:#fff3cd;color:#856404}.form-group{margin-bottom:18px;text-align:left}label{display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:13px}input[type=text],input[type=email],textarea{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit}input:focus,textarea:focus{outline:none;border-color:#667eea}.upload-area{border:2px dashed #667eea;border-radius:10px;padding:25px;text-align:center;cursor:pointer;background:#f8f9ff;transition:all 0.3s}.upload-area:hover{background:#e8ecff}.upload-area .icon{font-size:32px;margin-bottom:8px}.btn-group{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px}.file-list{margin-top:15px;text-align:left}.file-item{display:flex;justify-content:space-between;align-items:center;padding:10px;background:#f5f5f5;border-radius:6px;margin-bottom:6px;font-size:13px}.file-item button{width:auto;padding:4px 10px;background:#e74c3c;font-size:11px}.file-thumb{width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px}.camera-modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:1000;justify-content:center;align-items:center;flex-direction:column;padding:20px}.camera-modal.show{display:flex}.camera-video{max-width:100%;max-height:60vh;border-radius:10px;border:3px solid white}.camera-controls{margin-top:20px;display:flex;gap:10px}.camera-controls button{padding:12px 24px}.warning{background:#fff3cd;padding:15px;border-radius:8px;color:#856404;font-size:13px;margin-bottom:20px}.setup-link{display:inline-block;margin-top:10px;color:#667eea;text-decoration:underline;font-size:12px}</style></head><body><div class=box><h1>📄 Document Scanner</h1><p class=subtitle>ส่งเอกสารและรูปภาพเข้าอีเมล</p>' +
    (hasToken ? '<div class=target-email>📬 ส่งเข้า: <strong>' + FIXED_RECIPIENT + '</strong></div>' : '<div class=warning>⚠️ ระบบยังไม่ได้ตั้งค่า<br><a href="/setup" class=setup-link>🔧 คลิกที่นี่เพื่อตั้งค่า (Admin เท่านั้น)</a></div>') +
    '<div class=btn-group><button type=button id=uploadBtn class=btn-secondary>📎 เลือกไฟล์</button><button type=button id=cameraBtn class=btn-camera>📸 ถ่ายภาพ</button></div><input type=file id=fileInput multiple accept="image/*,application/pdf" style="display:none"><div class=upload-area id=dropArea><div class=icon>📁</div><p><strong>ลากและวาง</strong> ไฟล์ที่นี่</p><p style="font-size:12px;color:#999">รองรับ: รูปภาพ, PDF (สูงสุด 10MB ต่อไฟล์)</p></div><div class=file-list id=fileList></div><form id=emailForm style="margin-top:20px"><div class=form-group><label>👤 ชื่อผู้ส่ง</label><input type=text id=senderName placeholder="เช่น: คุณสมชาย" required></div><div class=form-group><label>✉️ หัวเรื่อง</label><input type=text id=emailSubject value="เอกสารใหม่" required></div><div class=form-group><label>💬 รายละเอียด</label><textarea id=emailMessage rows=3 placeholder="ระบุรายละเอียดของเอกสาร"></textarea></div><button type=submit id=sendBtn>📤 ส่งเอกสาร</button></form><div id=status class=status></div></div><div class=camera-modal id=cameraModal><video class=camera-video id=cameraVideo autoplay playsinline></video><canvas id=cameraCanvas style="display:none"></canvas><div class=camera-controls><button id=captureBtn class=btn-secondary>📸 ถ่ายภาพ</button><button id=closeCameraBtn class=btn-camera>❌ ปิด</button></div></div><script>const API=window.location.origin;const emailForm=document.getElementById("emailForm");const status=document.getElementById("status");const sendBtn=document.getElementById("sendBtn");const uploadBtn=document.getElementById("uploadBtn");const cameraBtn=document.getElementById("cameraBtn");const fileInput=document.getElementById("fileInput");const dropArea=document.getElementById("dropArea");const fileList=document.getElementById("fileList");const cameraModal=document.getElementById("cameraModal");const cameraVideo=document.getElementById("cameraVideo");const cameraCanvas=document.getElementById("cameraCanvas");const captureBtn=document.getElementById("captureBtn");const closeCameraBtn=document.getElementById("closeCameraBtn");let attachedFiles=[];let cameraStream=null;function showStatus(msg,type){status.textContent=msg;status.className="status show "+type;if(type==="success")setTimeout(()=>status.classList.remove("show"),5000);}uploadBtn.onclick=()=>fileInput.click();fileInput.onchange=(e)=>handleFiles(Array.from(e.target.files));dropArea.ondragover=(e)=>{e.preventDefault();dropArea.style.background="#e8ecff";};dropArea.ondragleave=()=>{dropArea.style.background="#f8f9ff";};dropArea.ondrop=(e)=>{e.preventDefault();dropArea.style.background="#f8f9ff";handleFiles(Array.from(e.dataTransfer.files));};function handleFiles(files){files.forEach(file=>{if(file.size>10*1024*1024){showStatus("❌ ไฟล์ "+file.name+" ใหญ่เกิน 10MB","error");return;}const reader=new FileReader();reader.onload=(e)=>{attachedFiles.push({name:file.name,type:file.type,data:e.target.result.split(",")[1],size:file.size});renderFileList();};reader.readAsDataURL(file);});}function renderFileList(){fileList.innerHTML="";attachedFiles.forEach((f,i)=>{const item=document.createElement("div");item.className="file-item";const sizeKB=(f.size/1024).toFixed(1);const isImage=f.type.startsWith("image/");item.innerHTML=(isImage?\'<img class=file-thumb src="data:\'+f.type+\';base64,\'+f.data+\'">\':"📄 ")+"<span style=flex:1>"+f.name+" ("+sizeKB+" KB)</span><button onclick=removeFile("+i+")>ลบ</button>";fileList.appendChild(item);});}window.removeFile=(i)=>{attachedFiles.splice(i,1);renderFileList();};cameraBtn.onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});cameraVideo.srcObject=cameraStream;cameraModal.classList.add("show");}catch(e){showStatus("❌ ไม่สามารถเปิดกล้อง: "+e.message,"error");}};closeCameraBtn.onclick=()=>{if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraModal.classList.remove("show");};captureBtn.onclick=()=>{cameraCanvas.width=cameraVideo.videoWidth;cameraCanvas.height=cameraVideo.videoHeight;cameraCanvas.getContext("2d").drawImage(cameraVideo,0,0);cameraCanvas.toBlob((blob)=>{const reader=new FileReader();reader.onload=(e)=>{const data=e.target.result.split(",")[1];const fileName="photo_"+Date.now()+".jpg";attachedFiles.push({name:fileName,type:"image/jpeg",data:data,size:blob.size});renderFileList();showStatus("✅ ถ่ายภาพสำเร็จ!","success");};reader.readAsDataURL(blob);},"image/jpeg",0.85);};emailForm.onsubmit=async(e)=>{e.preventDefault();if(attachedFiles.length===0){showStatus("❌ กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์","error");return;}sendBtn.disabled=true;showStatus("⏳ กำลังส่ง...","loading");try{const r=await fetch(API+"/api/public-send",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({senderName:document.getElementById("senderName").value,emailSubject:document.getElementById("emailSubject").value,emailMessage:document.getElementById("emailMessage").value,attachments:attachedFiles})});const d=await r.json();if(d.success){showStatus("✅ ส่งเอกสารสำเร็จ! ("+attachedFiles.length+" ไฟล์)","success");attachedFiles=[];renderFileList();emailForm.reset();document.getElementById("emailSubject").value="เอกสารใหม่";}else{showStatus("❌ Error: "+d.error,"error");}}catch(e){showStatus("❌ Error: "+e.message,"error");}finally{sendBtn.disabled=false;}};</script></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Admin Setup Page - one-time setup
app.get('/setup', (req, res) => {
  const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><title>Admin Setup</title><style>body{font-family:sans-serif;background:#667eea;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.box{background:white;padding:40px;border-radius:15px;max-width:500px;text-align:center}h1{color:#333}p{color:#666;line-height:1.6}button{padding:12px 24px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:16px;margin-top:20px}code{background:#f5f5f5;padding:2px 8px;border-radius:4px;font-size:13px}.step{text-align:left;background:#f8f9ff;padding:15px;border-radius:8px;margin:10px 0;font-size:13px}</style></head><body><div class=box><h1>🔧 Admin Setup</h1><p>ตั้งค่าระบบส่งอีเมลครั้งแรก (ทำครั้งเดียว)</p><div class=step><strong>ขั้นตอน:</strong><br>1. คลิกปุ่ม Login ด้านล่าง<br>2. ลงชื่อด้วย <code>fesgroup58@gmail.com</code><br>3. ยืนยันสิทธิ์<br>4. คัดลอก refresh_token ที่ได้<br>5. นำไปใส่ใน Railway Variables ชื่อ <code>SYSTEM_REFRESH_TOKEN</code></div><button onclick="login()">🔐 Login ด้วย Google (Admin)</button></div><script>async function login(){const r=await fetch("/auth/google-login-url");const d=await r.json();window.location.href=d.authUrl;}</script></body></html>';
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

// OAuth Callback - show refresh_token for admin to copy
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('No code');

    const { tokens } = await oauth2Client.getToken(code);

    const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><title>Setup Complete</title><style>body{font-family:sans-serif;background:#48bb78;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}.box{background:white;padding:40px;border-radius:15px;max-width:700px;width:100%;text-align:center}h1{color:#2e7d32}.token-box{background:#f5f5f5;padding:15px;border-radius:8px;margin:20px 0;text-align:left;word-break:break-all;font-family:monospace;font-size:12px;color:#333;border:2px solid #4caf50}.copy-btn{padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:10px}.step{text-align:left;background:#fff3cd;padding:15px;border-radius:8px;margin:15px 0;font-size:14px;color:#856404}code{background:#333;color:white;padding:2px 8px;border-radius:4px;font-size:12px}.success-icon{font-size:48px;margin-bottom:10px}</style></head><body><div class=box><div class=success-icon>✅</div><h1>Setup สำเร็จ!</h1><p>คัดลอก Refresh Token ด้านล่างนี้:</p><div class=token-box id=tokenText>' + (tokens.refresh_token || 'NO_REFRESH_TOKEN') + '</div><button class=copy-btn onclick=copyToken()>📋 คัดลอก Token</button><div class=step><strong>ขั้นตอนถัดไป:</strong><br>1. คัดลอก token ด้านบน<br>2. ไป <code>Railway → Variables</code><br>3. คลิก <code>+ New Variable</code><br>4. ตั้งชื่อ: <code>SYSTEM_REFRESH_TOKEN</code><br>5. วาง token<br>6. Save<br>7. รอ Railway redeploy<br>8. App พร้อมใช้!</div><a href="/">⬅ กลับหน้าหลัก</a></div><script>function copyToken(){const text=document.getElementById("tokenText").textContent;navigator.clipboard.writeText(text).then(()=>alert("✅ คัดลอกแล้ว!"));}</script></body></html>';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(500).send('Auth failed: ' + error.message);
  }
});

// Public Send Email - no login required
app.post('/api/public-send', async (req, res) => {
  try {
    const { senderName, emailSubject, emailMessage, attachments } = req.body;

    if (!process.env.SYSTEM_REFRESH_TOKEN) {
      return res.status(500).json({ error: 'ระบบยังไม่ได้ตั้งค่า กรุณาติดต่อ admin' });
    }

    if (!senderName) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ส่ง' });
    }

    if (!attachments || attachments.length === 0) {
      return res.status(400).json({ error: 'กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์' });
    }

    oauth2Client.setCredentials({ refresh_token: process.env.SYSTEM_REFRESH_TOKEN });
    await oauth2Client.refreshAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const fullSubject = '[' + senderName + '] ' + (emailSubject || 'เอกสารใหม่');
    const encodedSubject = '=?UTF-8?B?' + Buffer.from(fullSubject).toString('base64') + '?=';

    const emailBody = '📨 มีเอกสารใหม่ส่งเข้ามา\n\n' +
      '👤 ผู้ส่ง: ' + senderName + '\n' +
      '📅 วันที่: ' + new Date().toLocaleString('th-TH') + '\n' +
      '📎 จำนวนไฟล์: ' + attachments.length + ' ไฟล์\n\n' +
      '💬 รายละเอียด:\n' + (emailMessage || '-') + '\n\n' +
      '---\n' +
      'ส่งผ่าน Document Scanner App\n' +
      'https://web-production-2f611f.up.railway.app';

    const boundary = 'boundary_' + Date.now();
    let message = [
      'From: Document Scanner <' + FIXED_RECIPIENT + '>',
      'To: ' + FIXED_RECIPIENT,
      'Subject: ' + encodedSubject,
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="' + boundary + '"',
      '',
      '--' + boundary,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(emailBody).toString('base64'),
      ''
    ];

    for (const att of attachments) {
      const encodedFileName = '=?UTF-8?B?' + Buffer.from(att.name).toString('base64') + '?=';
      message.push('--' + boundary);
      message.push('Content-Type: ' + att.type + '; name="' + encodedFileName + '"');
      message.push('Content-Disposition: attachment; filename="' + encodedFileName + '"');
      message.push('Content-Transfer-Encoding: base64');
      message.push('');
      message.push(att.data);
      message.push('');
    }

    message.push('--' + boundary + '--');

    const rawMessage = message.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log('Email sent from:', senderName, '- Files:', attachments.length);
    res.json({ success: true, message: 'Email sent', filesCount: attachments.length });
  } catch (error) {
    console.error('Email error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    setup: !!process.env.SYSTEM_REFRESH_TOKEN,
    time: new Date().toISOString()
  });
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('Recipient:', FIXED_RECIPIENT);
  console.log('Setup status:', !!process.env.SYSTEM_REFRESH_TOKEN ? 'READY' : 'NEEDS SETUP - go to /setup');
});
