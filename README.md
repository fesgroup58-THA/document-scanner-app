# 📄 Document Scanner App with OAuth 2.0

เอกสาร Scanner ที่สมบูรณ์ เชื่อมต่อ Gmail API ส่งอีเมลอัตโนมัติผ่าน OAuth 2.0

---

## 🚀 Deploy ไปยัง Railway.app

### **ขั้นตอนที่ 1: สร้าง GitHub Repository**

```bash
# 1. นำไฟล์ทั้งหมดขึ้น GitHub
# - สร้าง repo ใหม่: https://github.com/new
# - ชื่อ: document-scanner-app
# - Push ไฟล์ทั้งหมดขึ้น

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/document-scanner-app.git
git push -u origin main
```

---

### **ขั้นตอนที่ 2: Deploy บน Railway.app**

#### **2.1 เข้า Railway.app**
1. ไปที่ https://railway.app/
2. ลงชื่อเข้าด้วย GitHub (Authorize Railway)

#### **2.2 สร้าง Project ใหม่**
1. คลิก "New Project"
2. เลือก "Deploy from GitHub"
3. เลือก repository: `document-scanner-app`

#### **2.3 Configure Environment Variables**

Railway จะแสดง Dashboard หลัง deploy

ไปที่ **Variables** และเพิ่ม:

```
GOOGLE_CLIENT_ID=330181663366-v8g6iueboedjv3s1cv0o5p2hq8dmph7c.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
PORT=3000
NODE_ENV=production
REDIRECT_URI=https://your-railway-app-name.up.railway.app
SENDER_EMAIL=fesgroup58@gmail.com
```

**หมายเหตุ:** 
- `REDIRECT_URI` จะเป็น URL ของ Railway app ของคุณ (เช่น `https://document-scanner-app.up.railway.app`)
- ได้จาก Railway Dashboard ด้านขวา

---

### **ขั้นตอนที่ 3: Update Google OAuth Settings**

1. ไปที่ **Google Cloud Console** → **APIs & Services** → **Credentials**
2. แก้ไข OAuth 2.0 Client ID
3. เพิ่มใน **Authorized redirect URIs:**
   ```
   https://your-railway-app-name.up.railway.app/auth/callback
   ```

---

## 📱 ใช้งาน App

### **Local Development**

```bash
# 1. Install dependencies
npm install

# 2. สร้าง .env จาก .env.example
cp .env.example .env

# 3. กรอก Environment Variables ใน .env

# 4. Run server
npm start

# 5. เข้าที่ http://localhost:3000
```

---

## 🔑 Google OAuth Flow

```
1. User คลิก "ลงชื่อเข้าด้วย Google"
   ↓
2. Redirect ไป Google OAuth Dialog
   ↓
3. User ยินยอมเข้าถึง Gmail API
   ↓
4. Google ส่ง Authorization Code กลับ
   ↓
5. Backend แลก Code เป็น Access Token + Refresh Token
   ↓
6. User ได้สิทธิ์ส่ง Email ผ่าน Gmail API
```

---

## 📧 Email Flow

```
1. User อัปโหลดเอกสาร
2. Backend ประมวลผล (ประมาณนี้ simulate เท่านั้น)
3. User ใส่ Email ปลายทาง
4. Backend ส่ง Email ผ่าน Gmail API
5. Email ถูกส่งไปยัง fesgroup58@gmail.com
```

---

## 📁 โครงสร้าง Folder

```
document-scanner-app/
├── server.js              # Backend Server
├── package.json           # Dependencies
├── .env.example          # Configuration Template
├── Procfile              # Railway Configuration
├── .gitignore
├── README.md
└── public/
    └── index.html        # Frontend UI
```

---

## 🔧 API Endpoints

### **GET /auth/google-login-url**
ได้รับ OAuth Login URL

Response:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

### **POST /auth/callback**
Handle OAuth Callback

Request:
```json
{
  "code": "4/0AX4XfW..."
}
```

Response:
```json
{
  "success": true,
  "user": {
    "email": "user@gmail.com",
    "name": "User Name"
  },
  "tokens": {
    "access_token": "ya29.a0A...",
    "refresh_token": "1//0g..."
  }
}
```

---

### **POST /api/send-email**
ส่ง Email ผ่าน Gmail API

Request:
```json
{
  "refreshToken": "1//0g...",
  "recipientEmail": "fesgroup58@gmail.com",
  "emailSubject": "Document Report",
  "emailMessage": "Additional message",
  "documentSummary": "Summary text",
  "documentNames": ["file1.pdf", "file2.docx"]
}
```

Response:
```json
{
  "success": true,
  "message": "Email sent successfully to fesgroup58@gmail.com"
}
```

---

## ⚠️ Important Notes

1. **Client Secret**: ห้ามแชร์ให้ใครรู้
2. **Refresh Token**: เก็บไว้ใน Client ให้ดี (localStorage)
3. **CORS**: Backend ใช้ CORS เพื่อให้ Frontend เข้าถึงได้
4. **Environment Variables**: ใช้ Railway Dashboard เพื่อตั้ง

---

## 🚨 Troubleshooting

### **Error: "Invalid redirect_uri"**
→ ตรวจสอบว่า Redirect URI ตรงกับ Google OAuth Settings

### **Error: "Unauthorized"**
→ ตรวจสอบว่า Client ID/Secret ถูกต้อง

### **Email not sent**
→ ตรวจสอบว่า Gmail API Enable แล้ว
→ User ต้อง Authorize Email Sending Scope

---

## 📞 Support

มีปัญหาไหม? บอกฉัน! 😊

---

**Created with ❤️ by Document Scanner Team**
