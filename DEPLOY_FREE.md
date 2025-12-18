# Free Deployment Options (No Upgrade Required)

Railway is asking for an upgrade? Here are **completely free** alternatives:

## Option 1: Render.com (Recommended - Free Forever)

### Step 1: Sign Up
1. Go to https://render.com
2. Sign up with GitHub (easiest) or email
3. **Free tier available** - no credit card required!

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
   - OR use "Public Git repository" and paste your repo URL
   - OR use "Deploy without Git" to upload manually

### Step 3: Configure Service
- **Name**: `ef-dashboard-api` (or any name)
- **Environment**: `Node`
- **Region**: Choose closest to you
- **Branch**: `main` or `master`
- **Root Directory**: Leave empty (or `.` if needed)
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### Step 4: Add Environment Variables
Click "Advanced" → "Add Environment Variable" and add:

```env
MONGODB_URL=your_mongodb_connection_string
MONGODB_DB=recommendation_db
NEW_FEATURES_COLLECTION=analytics
NEW_PRODUCTS_COLLECTION=ef_products
PORT=5000
NODE_ENV=production
JWT_SECRET=any-random-secret-string-here
```

### Step 5: Deploy
1. Click "Create Web Service"
2. Wait 5-10 minutes for first deployment
3. You'll get a URL like: `https://ef-dashboard-api.onrender.com`

### Step 6: Update Frontend
```bash
VITE_API_URL=https://ef-dashboard-api.onrender.com npm run build
```

**Note**: Render free tier may sleep after 15 minutes of inactivity, but wakes up automatically on first request (may take 30-60 seconds).

---

## Option 2: Fly.io (Free Tier Available)

### Step 1: Sign Up
1. Go to https://fly.io
2. Sign up (free tier available)

### Step 2: Install Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Or download from: https://fly.io/docs/hands-on/install-flyctl/
```

### Step 3: Login
```bash
fly auth login
```

### Step 4: Create App
```bash
fly launch
```
Follow the prompts. It will create a `fly.toml` file.

### Step 5: Set Secrets (Environment Variables)
```bash
fly secrets set MONGODB_URL=your_mongodb_connection_string
fly secrets set MONGODB_DB=recommendation_db
fly secrets set NODE_ENV=production
fly secrets set PORT=5000
fly secrets set JWT_SECRET=your-secret-key
```

### Step 6: Deploy
```bash
fly deploy
```

---

## Option 3: Cyclic.sh (Free Tier)

### Step 1: Sign Up
1. Go to https://cyclic.sh
2. Sign up with GitHub

### Step 2: Deploy
1. Click "Deploy Now"
2. Connect your GitHub repo
3. Cyclic auto-detects Node.js
4. Add environment variables in dashboard
5. Deploy!

---

## Option 4: Koyeb (Free Tier)

### Step 1: Sign Up
1. Go to https://www.koyeb.com
2. Sign up (free tier available)

### Step 2: Deploy
1. Click "Create App"
2. Connect GitHub repo
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy!

---

## Option 5: Replit (Free Tier)

### Step 1: Sign Up
1. Go to https://replit.com
2. Sign up (free tier available)

### Step 2: Create Repl
1. Click "Create Repl"
2. Choose "Node.js" template
3. Upload your project files
4. Set environment variables in "Secrets" tab
5. Click "Run"

---

## Quick Comparison

| Service | Free Tier | Sleeps? | Best For |
|--------|-----------|---------|----------|
| **Render** | ✅ Yes | Yes (15 min) | Easiest, most reliable |
| **Fly.io** | ✅ Yes | No | Always-on, fast |
| **Cyclic** | ✅ Yes | No | Simple deployments |
| **Koyeb** | ✅ Yes | No | Good performance |
| **Replit** | ✅ Yes | Yes | Quick testing |

## Recommended: Render.com

**Why Render?**
- ✅ Completely free (no credit card needed)
- ✅ Easy to use
- ✅ Auto-deploys from GitHub
- ✅ Good documentation
- ⚠️ May sleep after inactivity (but wakes automatically)

## After Deployment

Once you have your backend URL (e.g., `https://your-app.onrender.com`):

1. **Rebuild frontend:**
   ```bash
   VITE_API_URL=https://your-app.onrender.com npm run build
   ```

2. **Or create `.env` file:**
   ```env
   VITE_API_URL=https://your-app.onrender.com
   ```
   Then: `npm run build`

3. **Upload** `dist/public` to your server

## Troubleshooting

### Render: Service sleeping
- First request after sleep takes 30-60 seconds
- Consider upgrading to paid plan for always-on (optional)
- Or use Fly.io for always-on free tier

### Build fails
- Check logs in dashboard
- Verify `package.json` has correct scripts
- Ensure Node.js version is compatible (Render uses Node 18+)

### Environment variables not working
- Make sure variables are set in dashboard
- Restart service after adding variables
- Check variable names match exactly (case-sensitive)

