# 🗄️ MongoDB Setup Guide for BloodMe

## **Option 1: MongoDB Atlas (Cloud - RECOMMENDED for Demo)**

### **Why Atlas is Better for Hackathon:**
- ✅ **No installation needed** - Works immediately
- ✅ **Always available** - No service management
- ✅ **Free tier** - 512MB storage, perfect for demo
- ✅ **Global access** - Works from anywhere
- ✅ **Automatic backups** - Data safety

### **Setup Steps:**
1. **Already configured in your .env file** ✅
2. **Just start your backend** - It will connect automatically
3. **Database will be created automatically** when you register users

---

## **Option 2: Local MongoDB Installation**

### **Download & Install:**
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - **Version**: 7.0.x (Current)
   - **Platform**: Windows
   - **Package**: MSI
3. Download and run the installer

### **Installation Options:**
- ✅ **Complete Setup** (Recommended)
- ✅ **Install MongoDB as a Service** (Check this box)
- ✅ **Install MongoDB Compass** (You already have this)

### **After Installation:**
1. **MongoDB Service** will start automatically
2. **Default connection**: `mongodb://localhost:27017`
3. **Update your .env**:
   ```
   MONGODB_URI=mongodb://localhost:27017/bloodme
   ```

### **Verify Installation:**
```powershell
# Check if MongoDB service is running
Get-Service MongoDB

# Should show: Status=Running
```

---

## **Option 3: Docker MongoDB (Alternative)**

If you prefer Docker:

```bash
# Start MongoDB container
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Update .env
MONGODB_URI=mongodb://localhost:27017/bloodme
```

---

## **🚀 RECOMMENDED APPROACH FOR YOUR DEMO**

### **Use MongoDB Atlas (Option 1):**

**Why?**
- ✅ **Zero setup time** - Focus on your demo, not database setup
- ✅ **Always works** - No local service issues during presentation
- ✅ **Professional** - Shows you understand cloud deployment
- ✅ **Reliable** - Won't fail during your demo

**Your .env is already configured for Atlas!**

Just start your backend and it will work immediately.

---

## **🔧 TESTING YOUR DATABASE CONNECTION**

### **Start Backend Server:**
```powershell
cd backend
npm run start:dev
```

### **Look for Success Messages:**
```
🚀 Blood Donor API running on port 3001
🩸 HACKATHON DEMO MODE: Ready for presentation!
```

### **If you see connection errors:**
- **Atlas**: Connection string is working, check internet
- **Local**: Install MongoDB Community Server first

---

## **📊 VERIFYING DATA PERSISTENCE**

### **Test Flow:**
1. **Start backend** - `npm run start:dev`
2. **Start frontend** - `npm run dev`
3. **Register new user** - Use your real name and blood group
4. **Check dashboard** - Should show your actual data
5. **Refresh page** - Data should persist

### **Using MongoDB Compass:**
1. **Connect to**: `mongodb+srv://bloodme:bloodme123@cluster0.mongodb.net/`
2. **Database**: `bloodme`
3. **Collections**: `users`, `donors`, `hospitals`, `alerts`
4. **View your data** - See actual registered users

---

## **🎯 FOR YOUR HACKATHON DEMO**

### **Recommended Setup:**
1. **Use MongoDB Atlas** (already configured)
2. **Start backend**: `cd backend && npm run start:dev`
3. **Start frontend**: `cd frontend && npm run dev`
4. **Register as yourself** - Real name, real blood group
5. **Demo works perfectly** with real database persistence

### **Backup Plan:**
If database fails during demo, your app automatically falls back to localStorage persistence, so the demo still works!

---

## **🚨 TROUBLESHOOTING**

### **Backend won't start:**
```powershell
# Check Node.js version
node --version  # Should be 18+

# Install dependencies
cd backend
npm install

# Start in development mode
npm run start:dev
```

### **Database connection fails:**
- **Atlas**: Check internet connection
- **Local**: Install MongoDB Community Server
- **Fallback**: App uses localStorage automatically

### **Can't see data in Compass:**
1. **Connection string**: `mongodb+srv://bloodme:bloodme123@cluster0.mongodb.net/`
2. **Database name**: `bloodme`
3. **Register a user first** - Database is created on first use

---

**BOTTOM LINE: Use MongoDB Atlas (Option 1) - it's already configured and will work immediately for your demo!** 🚀