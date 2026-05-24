const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  (process.env.REDIRECT_URI || 'http://localhost:3000') + '/auth/callback'
);

const FIXED_RECIPIENT = 'fesgroup58@gmail.com';

// Home Page - Advanced Scanner
app.get('/', (req, res) => {
  const hasToken = !!process.env.SYSTEM_REFRESH_TOKEN;
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Document Scanner - สแกนเอกสาร</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); min-height: 100vh; padding: 20px; }
.container { max-width: 700px; margin: 0 auto; background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
h1 { color: #333; text-align: center; margin-bottom: 8px; }
.subtitle { color: #666; text-align: center; margin-bottom: 20px; font-size: 14px; }
.target-email { background: #e8f5e9; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px; font-size: 13px; color: #2e7d32; border-left: 4px solid #4caf50; }
.warning { background: #fff3cd; padding: 15px; border-radius: 8px; color: #856404; font-size: 13px; margin-bottom: 20px; }
button { padding: 12px 24px; font-size: 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%; transition: all 0.2s; }
button:hover:not(:disabled) { background: #764ba2; transform: translateY(-1px); }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-scan { background: #ed8936; font-size: 18px; padding: 16px; margin-bottom: 15px; }
.btn-scan:hover:not(:disabled) { background: #dd6b20; }
.btn-upload { background: #48bb78; }
.btn-upload:hover:not(:disabled) { background: #38a169; }
.btn-danger { background: #e74c3c; width: auto; padding: 8px 16px; font-size: 13px; }
.btn-secondary { background: #6c757d; }
.btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
.status { margin-top: 20px; padding: 15px; border-radius: 8px; font-size: 14px; display: none; }
.status.show { display: block; }
.success { background: #d4edda; color: #155724; }
.error { background: #f8d7da; color: #721c24; }
.loading { background: #fff3cd; color: #856404; }
.form-group { margin-bottom: 18px; }
label { display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 13px; }
input[type=text], textarea { width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; font-family: inherit; }
input:focus, textarea:focus { outline: none; border-color: #667eea; }
.pages-list { margin-top: 15px; }
.page-item { background: #f8f9ff; padding: 10px; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
.page-thumb { width: 60px; height: 80px; object-fit: cover; border-radius: 4px; border: 2px solid #ddd; }
.page-info { flex: 1; font-size: 13px; }
.page-info strong { color: #333; display: block; margin-bottom: 4px; }
.page-info span { color: #666; }
.scanner-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; flex-direction: column; padding: 10px; }
.scanner-modal.show { display: flex; }
.scanner-header { color: white; text-align: center; padding: 10px; font-size: 14px; }
.scanner-video-container { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
#videoElement { max-width: 100%; max-height: 100%; }
#overlayCanvas { position: absolute; top: 0; left: 0; pointer-events: none; }
.scanner-controls { padding: 15px; display: flex; gap: 10px; }
.scanner-controls button { flex: 1; padding: 14px; }
.btn-capture { background: #4caf50; }
.btn-close { background: #e74c3c; }
.preview-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1001; flex-direction: column; padding: 20px; overflow: auto; }
.preview-modal.show { display: flex; }
.preview-content { background: white; border-radius: 10px; padding: 20px; max-width: 500px; margin: 0 auto; width: 100%; }
.preview-canvas { width: 100%; max-height: 60vh; object-fit: contain; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 15px; }
.preview-controls { display: flex; gap: 10px; flex-wrap: wrap; }
.preview-controls button { flex: 1; min-width: 100px; }
.mode-buttons { display: flex; gap: 5px; margin-bottom: 10px; }
.mode-btn { flex: 1; padding: 8px; background: #f0f0f0; color: #333; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
.mode-btn.active { background: #667eea; color: white; border-color: #667eea; }
.loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; z-index: 999; }
.spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 10px; }
@keyframes spin { to { transform: rotate(360deg); } }
.detection-status { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; z-index: 10; }
.detection-status.detected { background: rgba(76, 175, 80, 0.9); }
</style>
</head>
<body>
<div class="container">
  <h1>📄 Document Scanner</h1>
  <p class="subtitle">สแกนเอกสารและส่งเป็น PDF เข้าอีเมล</p>
  ${hasToken ? `<div class="target-email">📬 ส่งเข้า: <strong>${FIXED_RECIPIENT}</strong></div>` : `<div class="warning">⚠️ ระบบยังไม่ได้ตั้งค่า<br><a href="/setup">🔧 ตั้งค่า Admin</a></div>`}

  <button id="scanBtn" class="btn-scan">📸 สแกนเอกสาร</button>
  <button id="uploadBtn" class="btn-upload">📎 อัปโหลดรูปภาพ</button>
  <input type="file" id="fileInput" multiple accept="image/*" style="display:none">

  <div id="pagesList" class="pages-list"></div>

  <form id="emailForm" style="margin-top:20px;display:none" id="emailFormContainer">
    <div class="form-group">
      <label>👤 ชื่อผู้ส่ง</label>
      <input type="text" id="senderName" placeholder="เช่น: คุณสมชาย" required>
    </div>
    <div class="form-group">
      <label>✉️ หัวเรื่อง</label>
      <input type="text" id="emailSubject" value="เอกสารสแกน" required>
    </div>
    <div class="form-group">
      <label>💬 รายละเอียด</label>
      <textarea id="emailMessage" rows="2" placeholder="ระบุรายละเอียด (ไม่บังคับ)"></textarea>
    </div>
    <button type="submit" id="sendBtn">📤 ส่งเป็น PDF</button>
  </form>

  <div id="status" class="status"></div>
</div>

<!-- Scanner Modal -->
<div class="scanner-modal" id="scannerModal">
  <div class="scanner-header">📸 จัดเอกสารให้อยู่ในกรอบ - ระบบจะตรวจจับขอบอัตโนมัติ</div>
  <div class="scanner-video-container">
    <video id="videoElement" autoplay playsinline></video>
    <canvas id="overlayCanvas"></canvas>
    <div class="detection-status" id="detectionStatus">⏳ กำลังตรวจจับ...</div>
  </div>
  <div class="scanner-controls">
    <button id="captureBtn" class="btn-capture">📸 ถ่ายภาพ</button>
    <button id="closeScannerBtn" class="btn-close">❌ ปิด</button>
  </div>
</div>

<!-- Preview Modal -->
<div class="preview-modal" id="previewModal">
  <div class="preview-content">
    <h3 style="margin-bottom:10px">🖼️ ดูตัวอย่าง</h3>
    <div class="mode-buttons">
      <button class="mode-btn active" data-mode="enhanced">✨ ปรับแต่ง</button>
      <button class="mode-btn" data-mode="bw">⚫ ขาวดำ</button>
      <button class="mode-btn" data-mode="original">📷 ต้นฉบับ</button>
    </div>
    <canvas id="previewCanvas" class="preview-canvas"></canvas>
    <div class="preview-controls">
      <button id="saveBtn" class="btn-upload">✅ บันทึก</button>
      <button id="retakeBtn" class="btn-secondary">🔄 ถ่ายใหม่</button>
      <button id="cancelPreviewBtn" class="btn-danger">❌ ยกเลิก</button>
    </div>
  </div>
</div>

<script src="https://docs.opencv.org/4.7.0/opencv.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jscanify@1.2.0/src/jscanify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

<script>
const API = window.location.origin;
const scanBtn = document.getElementById('scanBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const scannerModal = document.getElementById('scannerModal');
const previewModal = document.getElementById('previewModal');
const videoElement = document.getElementById('videoElement');
const overlayCanvas = document.getElementById('overlayCanvas');
const captureBtn = document.getElementById('captureBtn');
const closeScannerBtn = document.getElementById('closeScannerBtn');
const detectionStatus = document.getElementById('detectionStatus');
const previewCanvas = document.getElementById('previewCanvas');
const saveBtn = document.getElementById('saveBtn');
const retakeBtn = document.getElementById('retakeBtn');
const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');
const pagesList = document.getElementById('pagesList');
const emailForm = document.getElementById('emailForm');
const sendBtn = document.getElementById('sendBtn');
const status = document.getElementById('status');

let scannedPages = [];
let cameraStream = null;
let scanner = null;
let currentDetectionLoop = null;
let currentPreviewImage = null;
let currentEnhancedCanvas = null;
let currentMode = 'enhanced';

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = 'status show ' + type;
  if (type === 'success') setTimeout(() => status.classList.remove('show'), 5000);
}

// Wait for OpenCV
function waitForOpenCV(callback) {
  if (typeof cv !== 'undefined' && cv.Mat) {
    callback();
  } else {
    setTimeout(() => waitForOpenCV(callback), 100);
  }
}

scanBtn.onclick = async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = '⏳ กำลังโหลด...';

  waitForOpenCV(async () => {
    try {
      scanner = new jscanify();
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      videoElement.srcObject = cameraStream;
      scannerModal.classList.add('show');

      videoElement.onloadedmetadata = () => {
        overlayCanvas.width = videoElement.videoWidth;
        overlayCanvas.height = videoElement.videoHeight;
        startDetectionLoop();
      };

      scanBtn.disabled = false;
      scanBtn.textContent = '📸 สแกนเอกสาร';
    } catch (e) {
      showStatus('❌ ไม่สามารถเปิดกล้อง: ' + e.message, 'error');
      scanBtn.disabled = false;
      scanBtn.textContent = '📸 สแกนเอกสาร';
    }
  });
};

function startDetectionLoop() {
  const ctx = overlayCanvas.getContext('2d');

  function detect() {
    if (!scannerModal.classList.contains('show')) return;

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;
      tempCanvas.getContext('2d').drawImage(videoElement, 0, 0);

      const highlighted = scanner.highlightPaper(tempCanvas, {
        color: '#4caf50',
        thickness: 5
      });

      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      ctx.drawImage(highlighted, 0, 0);

      detectionStatus.textContent = '✅ ตรวจจับเอกสารแล้ว';
      detectionStatus.classList.add('detected');
    } catch (e) {
      detectionStatus.textContent = '⏳ กำลังตรวจจับ...';
      detectionStatus.classList.remove('detected');
    }

    currentDetectionLoop = requestAnimationFrame(detect);
  }
  detect();
}

captureBtn.onclick = () => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = videoElement.videoWidth;
  tempCanvas.height = videoElement.videoHeight;
  tempCanvas.getContext('2d').drawImage(videoElement, 0, 0);

  try {
    // Extract paper using jscanify
    const extracted = scanner.extractPaper(tempCanvas, 1240, 1754); // A4 ratio
    showPreview(extracted);
  } catch (e) {
    showStatus('❌ ไม่พบเอกสารในกรอบ ลองปรับมุมใหม่', 'error');
    return;
  }

  closeScannerModal();
};

closeScannerBtn.onclick = closeScannerModal;

function closeScannerModal() {
  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
  if (currentDetectionLoop) cancelAnimationFrame(currentDetectionLoop);
  scannerModal.classList.remove('show');
}

function showPreview(canvas) {
  currentPreviewImage = canvas;
  applyMode('enhanced');
  previewModal.classList.add('show');
}

// Mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyMode(btn.dataset.mode);
  };
});

function applyMode(mode) {
  currentMode = mode;
  if (!currentPreviewImage) return;

  const canvas = document.createElement('canvas');
  canvas.width = currentPreviewImage.width;
  canvas.height = currentPreviewImage.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(currentPreviewImage, 0, 0);

  if (mode === 'enhanced') {
    enhanceImage(canvas);
  } else if (mode === 'bw') {
    convertToBW(canvas);
  }
  // 'original' = no change

  currentEnhancedCanvas = canvas;

  // Display on preview canvas
  previewCanvas.width = canvas.width;
  previewCanvas.height = canvas.height;
  previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
}

function enhanceImage(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Auto contrast + brightness
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i+1] + data[i+2]) / 3;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const range = max - min;
  const factor = range > 0 ? 255 / range : 1;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - min) * factor * 1.1));
    data[i+1] = Math.min(255, Math.max(0, (data[i+1] - min) * factor * 1.1));
    data[i+2] = Math.min(255, Math.max(0, (data[i+2] - min) * factor * 1.1));
  }

  ctx.putImageData(imageData, 0, 0);
}

function convertToBW(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Adaptive threshold
  let avg = 0;
  for (let i = 0; i < data.length; i += 4) {
    avg += (data[i] + data[i+1] + data[i+2]) / 3;
  }
  avg = avg / (data.length / 4);
  const threshold = avg * 0.85;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i+1] + data[i+2]) / 3;
    const v = gray > threshold ? 255 : 0;
    data[i] = v;
    data[i+1] = v;
    data[i+2] = v;
  }

  ctx.putImageData(imageData, 0, 0);
}

saveBtn.onclick = () => {
  if (!currentEnhancedCanvas) return;
  const dataUrl = currentEnhancedCanvas.toDataURL('image/jpeg', 0.85);
  scannedPages.push(dataUrl);
  renderPagesList();
  previewModal.classList.remove('show');
  currentPreviewImage = null;
  currentEnhancedCanvas = null;
  showStatus('✅ บันทึกหน้านี้แล้ว ทั้งหมด: ' + scannedPages.length + ' หน้า', 'success');
};

retakeBtn.onclick = () => {
  previewModal.classList.remove('show');
  scanBtn.click();
};

cancelPreviewBtn.onclick = () => {
  previewModal.classList.remove('show');
  currentPreviewImage = null;
  currentEnhancedCanvas = null;
};

// Upload existing images
uploadBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        currentPreviewImage = canvas;
        applyMode('enhanced');
        previewModal.classList.add('show');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  fileInput.value = '';
};

function renderPagesList() {
  pagesList.innerHTML = '';
  if (scannedPages.length === 0) {
    emailForm.style.display = 'none';
    return;
  }
  emailForm.style.display = 'block';

  scannedPages.forEach((page, i) => {
    const item = document.createElement('div');
    item.className = 'page-item';
    item.innerHTML =
      '<img class="page-thumb" src="' + page + '">' +
      '<div class="page-info"><strong>หน้า ' + (i+1) + '</strong><span>คุณภาพดี พร้อมส่ง</span></div>' +
      '<button class="btn-danger" onclick="removePage(' + i + ')">ลบ</button>';
    pagesList.appendChild(item);
  });
}

window.removePage = (i) => {
  scannedPages.splice(i, 1);
  renderPagesList();
  showStatus('🗑️ ลบหน้าแล้ว เหลือ ' + scannedPages.length + ' หน้า', 'success');
};

emailForm.onsubmit = async (e) => {
  e.preventDefault();
  if (scannedPages.length === 0) {
    showStatus('❌ กรุณาสแกนอย่างน้อย 1 หน้า', 'error');
    return;
  }

  sendBtn.disabled = true;
  showStatus('⏳ กำลังสร้าง PDF...', 'loading');

  try {
    // Generate PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let i = 0; i < scannedPages.length; i++) {
      if (i > 0) pdf.addPage();
      const imgData = scannedPages[i];

      // Get image dimensions
      const img = new Image();
      await new Promise(resolve => {
        img.onload = resolve;
        img.src = imgData;
      });

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const imgRatio = img.width / img.height;
      const pdfRatio = pdfWidth / pdfHeight;

      let w, h;
      if (imgRatio > pdfRatio) {
        w = pdfWidth;
        h = pdfWidth / imgRatio;
      } else {
        h = pdfHeight;
        w = pdfHeight * imgRatio;
      }
      const x = (pdfWidth - w) / 2;
      const y = (pdfHeight - h) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, w, h);
    }

    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    const fileName = 'scan_' + Date.now() + '.pdf';

    showStatus('⏳ กำลังส่งอีเมล...', 'loading');

    const r = await fetch(API + '/api/public-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        senderName: document.getElementById('senderName').value,
        emailSubject: document.getElementById('emailSubject').value,
        emailMessage: document.getElementById('emailMessage').value,
        pdfData: pdfBase64,
        pdfName: fileName,
        pageCount: scannedPages.length
      })
    });

    const d = await r.json();
    if (d.success) {
      showStatus('✅ ส่งสำเร็จ! PDF ' + scannedPages.length + ' หน้า ส่งเข้าอีเมลแล้ว', 'success');
      scannedPages = [];
      renderPagesList();
      emailForm.reset();
      document.getElementById('emailSubject').value = 'เอกสารสแกน';
    } else {
      showStatus('❌ Error: ' + d.error, 'error');
    }
  } catch (e) {
    showStatus('❌ Error: ' + e.message, 'error');
  } finally {
    sendBtn.disabled = false;
  }
};
</script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Setup Page (Admin)
app.get('/setup', (req, res) => {
  const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><title>Admin Setup</title><style>body{font-family:sans-serif;background:#667eea;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}.box{background:white;padding:40px;border-radius:15px;max-width:500px;text-align:center}h1{color:#333}button{padding:12px 24px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:16px;margin-top:20px;width:100%}.step{text-align:left;background:#f8f9ff;padding:15px;border-radius:8px;margin:10px 0;font-size:13px}code{background:#f5f5f5;padding:2px 8px;border-radius:4px}</style></head><body><div class=box><h1>🔧 Admin Setup</h1><p>ตั้งค่าระบบส่งอีเมล (ทำครั้งเดียว)</p><div class=step>1. คลิก Login ด้านล่าง<br>2. ลงชื่อด้วย <code>fesgroup58@gmail.com</code><br>3. คัดลอก refresh_token<br>4. ใส่ใน Railway: <code>SYSTEM_REFRESH_TOKEN</code></div><button onclick="login()">🔐 Login Admin</button></div><script>async function login(){const r=await fetch("/auth/google-login-url");const d=await r.json();window.location.href=d.authUrl;}</script></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// OAuth URL
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
    if (!code) return res.status(400).send('No code');

    const { tokens } = await oauth2Client.getToken(code);

    const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><title>Setup Complete</title><style>body{font-family:sans-serif;background:#48bb78;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}.box{background:white;padding:40px;border-radius:15px;max-width:700px;width:100%;text-align:center}h1{color:#2e7d32}.token-box{background:#f5f5f5;padding:15px;border-radius:8px;margin:20px 0;text-align:left;word-break:break-all;font-family:monospace;font-size:12px;border:2px solid #4caf50}button{padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:10px}.step{text-align:left;background:#fff3cd;padding:15px;border-radius:8px;margin:15px 0;font-size:14px;color:#856404}code{background:#333;color:white;padding:2px 8px;border-radius:4px}</style></head><body><div class=box><h1>✅ Setup สำเร็จ!</h1><p>คัดลอก Refresh Token:</p><div class=token-box id=tokenText>' + (tokens.refresh_token || 'NO_TOKEN') + '</div><button onclick=copyToken()>📋 คัดลอก</button><div class=step><strong>ขั้นตอนถัดไป:</strong><br>1. คัดลอก token ด้านบน<br>2. ไป Railway → Variables<br>3. + New Variable<br>4. ชื่อ: <code>SYSTEM_REFRESH_TOKEN</code><br>5. วาง token → Save</div><a href="/">⬅ กลับหน้าหลัก</a></div><script>function copyToken(){navigator.clipboard.writeText(document.getElementById("tokenText").textContent).then(()=>alert("✅ คัดลอกแล้ว!"));}</script></body></html>';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).send('Auth failed: ' + error.message);
  }
});

// Send PDF via Email
app.post('/api/public-send', async (req, res) => {
  try {
    const { senderName, emailSubject, emailMessage, pdfData, pdfName, pageCount } = req.body;

    if (!process.env.SYSTEM_REFRESH_TOKEN) {
      return res.status(500).json({ error: 'ระบบยังไม่ได้ตั้งค่า' });
    }

    if (!senderName) return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ส่ง' });
    if (!pdfData) return res.status(400).json({ error: 'ไม่พบไฟล์ PDF' });

    oauth2Client.setCredentials({ refresh_token: process.env.SYSTEM_REFRESH_TOKEN });
    await oauth2Client.refreshAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const fullSubject = '[' + senderName + '] ' + (emailSubject || 'เอกสารสแกน');
    const encodedSubject = '=?UTF-8?B?' + Buffer.from(fullSubject).toString('base64') + '?=';

    const emailBody = '📨 มีเอกสารใหม่สแกนเข้ามา\n\n' +
      '👤 ผู้ส่ง: ' + senderName + '\n' +
      '📅 วันที่: ' + new Date().toLocaleString('th-TH') + '\n' +
      '📄 จำนวนหน้า: ' + (pageCount || 1) + ' หน้า\n\n' +
      '💬 รายละเอียด:\n' + (emailMessage || '-') + '\n\n' +
      '---\nDocument Scanner App';

    const boundary = 'boundary_' + Date.now();
    const encodedFileName = '=?UTF-8?B?' + Buffer.from(pdfName || 'scan.pdf').toString('base64') + '?=';

    const messageLines = [
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
      '',
      '--' + boundary,
      'Content-Type: application/pdf; name="' + encodedFileName + '"',
      'Content-Disposition: attachment; filename="' + encodedFileName + '"',
      'Content-Transfer-Encoding: base64',
      '',
      pdfData,
      '',
      '--' + boundary + '--'
    ];

    const rawMessage = messageLines.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log('PDF sent from:', senderName, '- Pages:', pageCount);
    res.json({ success: true, message: 'Email sent' });
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
  console.log('Setup:', !!process.env.SYSTEM_REFRESH_TOKEN ? 'READY' : 'NEEDS SETUP');
});
