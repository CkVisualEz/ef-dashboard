# Quick Free Deployment Guide - Railway

Deploy your backend API to Railway (free tier) in 5 minutes!

## Step 1: Sign Up for Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (easiest) or email

## Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo" (if you have the code on GitHub)
   - OR select "Empty Project" to deploy manually

## Step 3: Deploy from GitHub (Recommended)

1. **If your code is on GitHub:**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect it's a Node.js project

2. **If your code is NOT on GitHub:**
   - See "Manual Deployment" section below

## Step 4: Set Environment Variables

In Railway dashboard, go to your project → **Variables** tab, and add:

```env
MONGODB_URL=your_mongodb_connection_string_here
MONGODB_DB=recommendation_db
NEW_FEATURES_COLLECTION=analytics
NEW_PRODUCTS_COLLECTION=ef_products
PORT=5000
NODE_ENV=production
JWT_SECRET=change-this-to-a-random-string-in-production
```

**Important**: Replace `MONGODB_URL` with your actual MongoDB connection string!

## Step 5: Deploy

1. Railway will automatically start building and deploying
2. Wait for deployment to complete (usually 2-3 minutes)
3. Once deployed, Railway will give you a URL like: `https://your-app-name.up.railway.app`

## Step 6: Get Your Backend URL

1. In Railway dashboard, go to your service
2. Click on the **Settings** tab
3. Under **Domains**, you'll see your public URL
4. Copy this URL (e.g., `https://ef-dashboard-api.up.railway.app`)

## Step 7: Update Frontend

1. **Rebuild frontend with backend URL:**
   ```bash
   VITE_API_URL=https://your-app-name.up.railway.app npm run build
   ```

2. **Or create a `.env` file in the root:**
   ```env
   VITE_API_URL=https://your-app-name.up.railway.app
   ```
   Then run: `npm run build`

3. **Upload the new build** from `dist/public` to your server

## Manual Deployment (If not using GitHub)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize project:**
   ```bash
   railway init
   ```

4. **Set environment variables:**
   ```bash
   railway variables set MONGODB_URL=your_mongodb_connection_string
   railway variables set MONGODB_DB=recommendation_db
   railway variables set NODE_ENV=production
   railway variables set PORT=5000
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

## Alternative: Render.com (Also Free)

1. Go to https://render.com
2. Sign up (free tier available)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Set build command: `npm run build`
6. Set start command: `npm start`
7. Add environment variables (same as Railway)
8. Deploy!

## Testing Your Backend

Once deployed, test it:

```bash
curl https://your-app-name.up.railway.app/api/overview
```

You should get JSON data back. If you get an error, check:
- MongoDB connection string is correct
- All environment variables are set
- Railway logs (in dashboard) for errors

## Troubleshooting

### Build fails
- Check Railway logs in the dashboard
- Ensure `package.json` has correct build script
- Verify Node.js version (Railway auto-detects, but you can set it)

### API returns errors
- Check MongoDB connection string
- Verify database name is correct
- Check Railway logs for specific errors

### CORS errors
- Backend already has CORS configured for `visualez.com`
- If using a different domain, update `server/index.ts` CORS settings

## Free Tier Limits

**Railway:**
- $5 free credit per month
- Enough for small to medium traffic
- Auto-sleeps after inactivity (wakes on request)

**Render:**
- Free tier available
- May sleep after inactivity
- Good for demos

Both are perfect for temporary demo sites!

