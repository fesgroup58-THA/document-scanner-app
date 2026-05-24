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

// Home Page with Email Form + Upload + Camera
app.get('/', (req, res) => {
  const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Document Scanner</title><style>body{font-family:sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;justify-content:center;align-items:flex-start;min-height:100vh;margin:0;padding:20px}.box{background:white;padding:30px;border-radius:15px;text-align:center;max-width:600px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.2)}h1{color:#333;margin-bottom:8px}.subtitle{color:#666;margin-bottom:25px;font-size:14px}button{padding:12px 24px;font-size:16px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;width:100%}button:hover{background:#764ba2}button:disabled{opacity:0.6;cursor:not-allowed}.btn-secondary{background:#48bb78}.btn-secondary:hover{background:#38a169}.btn-camera{background:#ed8936}.btn-camera:hover{background:#dd6b20}.status{margin-top:20px;padding:15px;border-radius:8px;font-size:14px;display:none}.status.show{display:block}.success{background:#d4edda;color:#155724}.error{background:#f8d7da;color:#721c24}.loading{background:#fff3cd;color:#856404}.form-group{margin-bottom:18px;text-align:left}label{display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:13px}input[type=email],input[type=text],textarea{width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit}input:focus,textarea:focus{outline:none;border-color:#667eea}.user-info{background:#f0f4ff;padding:12px;border-radius:8px;margin-bottom:20px;font-size:13px;text-align:left}.hidden{display:none}.logout{color:#e74c3c;background:none;border:none;font-size:12px;cursor:pointer;text-decoration:underline;padding:0;margin-top:5px;width:auto}.upload-area{border:2px dashed #667eea;border-radius:10px;padding:25px;text-align:center;cursor:pointer;background:#f8f9ff;transition:all 0.3s}.upload-area:hover{background:#e8ecff;border-color:#764ba2}.upload-area p{margin:8px 0;color:#666;font-size:13px}.upload-area .icon{font-size:32px;margin-bottom:8px}.btn-group{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px}.file-list{margin-top:15px;text-align:left}.file-item{display:flex;justify-content:space-between;align-items:center;padding:10px;background:#f5f5f5;border-radius:6px;margin-bottom:6px;font-size:13px}.file-item button{width:auto;padding:4px 10px;background:#e74c3c;font-size:11px}.file-thumb{width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px}.camera-modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:1000;justify-content:center;align-items:center;flex-direction:column;padding:20px}.camera-modal.show{display:flex}.camera-video{max-width:100%;max-height:60vh;border-radius:10px;border:3px solid white}.camera-controls{margin-top:20px;display:flex;gap:10px}.camera-controls button{padding:12px 24px}</style></head><body><div class=box><h1>📄 Document Scanner</h1><p class=subtitle>สแกนเอกสารและส่งอีเมล</p><div id=loginSection><button id=loginBtn>🔐 ลงชื่อเข้า Google</button></div><div id=appSection class=hidden><div class=user-info>👤 <strong id=userEmail></strong><br><button class=logout id=logoutBtn>ออกจากระบบ</button></div><div class=btn-group><button type=button id=uploadBtn class=btn-secondary>📎 เลือกไฟล์</button><button type=button id=cameraBtn class=btn-camera>📸 ถ่ายภาพ</button></div><input type=file id=fileInput multiple accept="image/*,application/pdf" style="display:none"><div class=upload-area id=dropArea><div class=icon>📁</div><p><strong>ลากและวาง</strong> ไฟล์ที่นี่</p><p>หรือคลิกปุ่ม "เลือกไฟล์" / "ถ่ายภาพ" ด้านบน</p><p style="font-size:11px;color:#999">รองรับ: รูปภาพ, PDF</p></div><div class=file-list id=fileList></div><form id=emailForm style="margin-top:20px"><div class=form-group><label>📧 ส่งไปที่ Email</label><input type=email id=recipientEmail value=fesgroup58@gmail.com required></div><div class=form-group><label>✉️ หัวเรื่อง</label><input type=text id=emailSubject value="เอกสารสแกน" required></div><div class=form-group><label>💬 ข้อความ</label><textarea id=emailMessage rows=3 placeholder="ข้อความเพิ่มเติม">เอกสารถูกสแกนเสร็จแล้ว</textarea></div><button type=submit id=sendBtn>📤 ส่งอีเมล</button></form></div><div id=status class=status></div></div><div class=camera-modal id=cameraModal><video class=camera-video id=cameraVideo autoplay playsinline></video><canvas id=cameraCanvas style="display:none"></canvas><div class=camera-controls><button id=captureBtn class=btn-secondary>📸 ถ่ายภาพ</button><button id=closeCameraBtn class=btn-camera>❌ ปิด</button></div></div><script>const API=window.location.origin;const loginBtn=document.getElementById("loginBtn");const logoutBtn=document.getElementById("logoutBtn");const loginSection=document.getElementById("loginSection");const appSection=document.getElementById("appSection");const emailForm=document.getElementById("emailForm");const userEmail=document.getElementById("userEmail");const status=document.getElementById("status");const sendBtn=document.getElementById("sendBtn");const uploadBtn=document.getElementById("uploadBtn");const cameraBtn=document.getElementById("cameraBtn");const fileInput=document.getElementById("fileInput");const dropArea=document.getElementById("dropArea");const fileList=document.getElementById("fileList");const cameraModal=document.getElementById("cameraModal");const cameraVideo=document.getElementById("cameraVideo");const cameraCanvas=document.getElementById("cameraCanvas");const captureBtn=document.getElementById("captureBtn");const closeCameraBtn=document.getElementById("closeCameraBtn");let attachedFiles=[];let cameraStream=null;function showStatus(msg,type){status.textContent=msg;status.className="status show "+type;setTimeout(()=>{if(type==="success")status.classList.remove("show");},5000);}function checkAuth(){const tokens=localStorage.getItem("userTokens");const userData=localStorage.getItem("userData");if(tokens&&userData){const user=JSON.parse(userData);userEmail.textContent=user.email||"User";loginSection.classList.add("hidden");appSection.classList.remove("hidden");}}loginBtn.onclick=async()=>{try{const r=await fetch(API+"/auth/google-login-url");const d=await r.json();window.location.href=d.authUrl;}catch(e){showStatus("Error: "+e.message,"error");}};logoutBtn.onclick=()=>{localStorage.removeItem("userTokens");localStorage.removeItem("userData");location.reload();};uploadBtn.onclick=()=>fileInput.click();fileInput.onchange=(e)=>handleFiles(Array.from(e.target.files));dropArea.ondragover=(e)=>{e.preventDefault();dropArea.style.background="#e8ecff";};dropArea.ondragleave=()=>{dropArea.style.background="#f8f9ff";};dropArea.ondrop=(e)=>{e.preventDefault();dropArea.style.background="#f8f9ff";handleFiles(Array.from(e.dataTransfer.files));};function handleFiles(files){files.forEach(file=>{if(file.size>10*1024*1024){showStatus("❌ ไฟล์ "+file.name+" ใหญ่เกิน 10MB","error");return;}const reader=new FileReader();reader.onload=(e)=>{attachedFiles.push({name:file.name,type:file.type,data:e.target.result.split(",")[1],size:file.size});renderFileList();};reader.readAsDataURL(file);});}function renderFileList(){fileList.innerHTML="";attachedFiles.forEach((f,i)=>{const item=document.createElement("div");item.className="file-item";const sizeKB=(f.size/1024).toFixed(1);const isImage=f.type.startsWith("image/");item.innerHTML=(isImage?\'<img class=file-thumb src="data:\'+f.type+\';base64,\'+f.data+\'">\':"📄 ")+"<span style=flex:1>"+f.name+" ("+sizeKB+" KB)</span><button onclick=removeFile("+i+")>ลบ</button>";fileList.appendChild(item);});}window.removeFile=(i)=>{attachedFiles.splice(i,1);renderFileList();};cameraBtn.onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});cameraVideo.srcObject=cameraStream;cameraModal.classList.add("show");}catch(e){showStatus("❌ ไม่สามารถเปิดกล้อง: "+e.message,"error");}};closeCameraBtn.onclick=()=>{if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraModal.classList.remove("show");};captureBtn.onclick=()=>{cameraCanvas.width=cameraVideo.videoWidth;cameraCanvas.height=cameraVideo.videoHeight;cameraCanvas.getContext("2d").drawImage(cameraVideo,0,0);cameraCanvas.toBlob((blob)=>{const reader=new FileReader();reader.onload=(e)=>{const data=e.target.result.split(",")[1];const fileName="photo_"+Date.now()+".jpg";attachedFiles.push({name:fileName,type:"image/jpeg",data:data,size:blob.size});renderFileList();showStatus("✅ ถ่ายภาพสำเร็จ!","success");};reader.readAsDataURL(blob);},"image/jpeg",0.85);};emailForm.onsubmit=async(e)=>{e.preventDefault();const tokens=JSON.parse(localStorage.getItem("userTokens"));sendBtn.disabled=true;showStatus("⏳ กำลังส่ง...","loading");try{const r=await fetch(API+"/api/send-email",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({refreshToken:tokens.refresh_token,recipientEmail:document.getElementById("recipientEmail").value,emailSubject:document.getElementById("emailSubject").value,emailMessage:document.getElementById("emailMessage").value,attachments:attachedFiles})});const d=await r.json();if(d.success){showStatus("✅ ส่งอีเมลสำเร็จ! ("+attachedFiles.length+" ไฟล์)","success");attachedFiles=[];renderFileList();}else{showStatus("❌ Error: "+d.error,"error");}}catch(e){showStatus("❌ Error: "+e.message,"error");}finally{sendBtn.disabled=false;}};checkAuth();</script></body></html>';
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

// OAuth Callback - redirect to home with tokens
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('No code');

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userInfo = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: 'Bearer ' + tokens.access_token } }
    );

    const html = '<!DOCTYPE html><html><head><meta charset=UTF-8></head><body><script>' +
      'localStorage.setItem("userTokens", JSON.stringify({access_token:"' + (tokens.access_token || '') + '",refresh_token:"' + (tokens.refresh_token || '') + '"}));' +
      'localStorage.setItem("userData", JSON.stringify({email:"' + (userInfo.data.email || '') + '",name:"' + (userInfo.data.name || '') + '"}));' +
      'window.location.href = "/";' +
      '</script><p>Loading...</p></body></html>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(500).send('Auth failed: ' + error.message);
  }
});

// Send Email with attachments
app.post('/api/send-email', async (req, res) => {
  try {
    const { refreshToken, recipientEmail, emailSubject, emailMessage, attachments } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Not authenticated' });

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    await oauth2Client.refreshAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const encodedSubject = '=?UTF-8?B?' + Buffer.from(emailSubject || 'Document').toString('base64') + '?=';
    const emailBody = (emailMessage || 'Document scanned') + '\n\nวันที่: ' + new Date().toLocaleString('th-TH') + '\n\nจำนวนไฟล์แนบ: ' + (attachments ? attachments.length : 0) + '\n\n---\nสร้างโดย Document Scanner App';

    const boundary = 'boundary_' + Date.now();
    let message = [
      'From: noreply@documentscannerapp.com',
      'To: ' + recipientEmail,
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

    // Add attachments
    if (attachments && attachments.length > 0) {
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

    res.json({ success: true, message: 'Email sent', attachments: attachments ? attachments.length : 0 });
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
  console.log('Features: Upload + Camera + Email with attachments');
});
