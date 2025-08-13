# 🚀 Fluty Things Deployment Guide

## New Deployment Scripts

You now have improved deployment scripts that automatically rebuild your refactored app:

### 📋 **Available Scripts**

| Script | Purpose | Usage |
|--------|---------|-------|
| `./deploy.sh` | **Full deployment** - Build + Deploy | Recommended for production |
| `./build.sh` | **Build only** - Client + Server | Development builds |
| `./update_service.sh` | **Service only** - No building | Legacy/emergency use |

---

## 🎯 **Primary Deployment Script: `./deploy.sh`**

### **Basic Usage**
```bash
# Full deployment with defaults
./deploy.sh

# Custom configuration
./deploy.sh --port 4000

# Skip building (if already built)
./deploy.sh --skip-build
```

### **What it does:**
1. ✅ **Builds client** (React app → `client/dist/`)
2. ✅ **Builds server** (TypeScript → `server/dist/`)  
3. ✅ **Updates systemd service**
4. ✅ **Restarts service**
5. ✅ **Shows status & logs**

### **All Options:**
```bash
./deploy.sh [OPTIONS]

Options:
  --service-name NAME     Service name (default: thingsgame)
  --workdir PATH         Working directory (default: /root/ThingsGame)
  --port NUMBER          Server port (default: 4000)
  --node PATH            Node.js binary path (default: /usr/bin/node)
  --skip-build           Skip build steps, just update service
```

---

## 🔨 **Development Build Script: `./build.sh`**

### **Usage**
```bash
# Build both client and server
./build.sh

# Build only client (React app)
./build.sh --client-only

# Build only server (TypeScript)
./build.sh --server-only
```

### **Perfect for:**
- 🧪 Testing builds during development
- 🔄 CI/CD pipelines
- 🏃‍♂️ Quick iteration without service restart

---

## 💡 **Recommended Workflows**

### **🚀 Production Deployment**
```bash
# One command does everything
./deploy.sh
```

### **👨‍💻 Development Workflow**
```bash
# Build and test locally
./build.sh

# Deploy when ready (skip rebuild)
./deploy.sh --skip-build
```

### **🔧 Service Management**
```bash
# View live logs
sudo journalctl -u thingsgame -f

# Restart service only
sudo systemctl restart thingsgame

# Check status
sudo systemctl status thingsgame
```

---

## 🎯 **Migration from Old Script**

### **Before (old script):**
```bash
./update_service.sh
```

### **After (new script):**
```bash
./deploy.sh    # Builds first, then deploys
```

### **Key Improvements:**
- ✅ **Automatic building** of your refactored app
- ✅ **Better error handling** and feedback
- ✅ **Security hardening** in systemd service
- ✅ **Comprehensive logging** and status checks
- ✅ **Flexible options** for different scenarios

---

## 🏆 **Why This Matters**

With your newly refactored app architecture:
- 📦 **Client build** compiles your React components into optimized bundles
- 🔧 **Server build** compiles TypeScript for better performance
- 🚀 **Automatic deployment** ensures you're always running the latest code
- 🛡️ **Production optimizations** are applied during build

Your app is now **production-ready** with professional deployment practices! 🎉
