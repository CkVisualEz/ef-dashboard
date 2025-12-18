# Backend API Server Deployment Guide

## Overview

The EF Color Match Dashboard requires a **backend API server** to be running separately from the static frontend files. The backend handles:
- MongoDB database connections
- API endpoints for all dashboard data
- Authentication

## Required Environment Variables

Create a `.env` file in the **root directory** of the project with:

```env
# MongoDB Connection
MONGODB_URL=your_mongodb_connection_string
MONGODB_DB=recommendation_db

# Collections (optional - defaults shown)
NEW_FEATURES_COLLECTION=analytics
NEW_PRODUCTS_COLLECTION=ef_products

# Server Port (optional - defaults to 5000)
PORT=5000

# JWT Secret for Authentication (change in production!)
JWT_SECRET=your-secret-key-change-in-production
```

## Deployment Options

### Option 1: Deploy Backend to Node.js Hosting Service

#### Recommended Services:
- **Railway** (https://railway.app) - Easy MongoDB integration
- **Render** (https://render.com) - Free tier available
- **Heroku** (https://heroku.com) - Requires credit card
- **DigitalOcean App Platform** (https://www.digitalocean.com)
- **Fly.io** (https://fly.io)

#### Steps for Railway (Example):

1. **Create Account & Project**
   - Sign up at https://railway.app
   - Create a new project

2. **Deploy from GitHub** (Recommended)
   - Connect your GitHub repository
   - Railway will auto-detect Node.js
   - Set environment variables in Railway dashboard

3. **Or Deploy via CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

4. **Set Environment Variables in Railway Dashboard**:
   - Go to your project → Variables
   - Add all variables from `.env` file
   - **Important**: Set `NODE_ENV=production`

5. **Get Your Backend URL**:
   - Railway provides a URL like: `https://your-app.railway.app`
   - Note this URL for frontend configuration

6. **Update Frontend API Configuration**:
   - Rebuild frontend with `VITE_API_URL` environment variable:
   ```bash
   VITE_API_URL=https://your-app.railway.app npm run build
   ```
   - Or create a `.env` file in the root with:
   ```env
   VITE_API_URL=https://your-app.railway.app
   ```

### Option 2: Deploy Backend on Your Own Server

If you have a VPS or server with Node.js:

1. **Upload Backend Files**:
   ```bash
   # Upload these directories/files:
   - server/
   - dist/ (after building)
   - package.json
   - tsconfig.json
   - .env (with your MongoDB credentials)
   ```

2. **Install Dependencies**:
   ```bash
   npm install --production
   ```

3. **Build the Backend**:
   ```bash
   npm run build
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```

5. **Use PM2 for Process Management** (Recommended):
   ```bash
   npm install -g pm2
   pm2 start dist/index.cjs --name ef-dashboard-api
   pm2 save
   pm2 startup  # For auto-start on server reboot
   ```

6. **Configure Reverse Proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name api.visualez.com;  # Or your API subdomain
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Update Frontend**:
   - Set `VITE_API_URL=https://api.visualez.com` (or your API URL)
   - Rebuild frontend

### Option 3: Use API Proxy on Web Server

If your web server (Apache/Nginx) can proxy requests:

1. **Keep Backend Running Locally or on Separate Server**

2. **Configure Apache Proxy** (`.htaccess` or virtual host):
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     
     # Proxy API requests to backend server
     RewriteCond %{REQUEST_URI} ^/EF-Dashboard/api/
     RewriteRule ^EF-Dashboard/api/(.*)$ http://localhost:5000/api/$1 [P,L]
     
     # Handle static files and SPA routing
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteCond %{REQUEST_URI} !^/EF-Dashboard/api/
     RewriteRule ^EF-Dashboard/(.*)$ /EF-Dashboard/index.html [L]
   </IfModule>
   ```

3. **Enable Apache Modules**:
   ```bash
   sudo a2enmod proxy
   sudo a2enmod proxy_http
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

4. **Configure Nginx Proxy**:
   ```nginx
   location /EF-Dashboard/api/ {
       proxy_pass http://localhost:5000/api/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

## CORS Configuration (If Backend is Separate Domain)

If your backend is on a different domain, update `server/routes.ts` to allow CORS:

```typescript
import cors from 'cors';

// In registerRoutes function, add:
app.use(cors({
  origin: ['https://www.visualez.com', 'https://visualez.com'],
  credentials: true
}));
```

## Testing the Backend

1. **Check if Backend is Running**:
   ```bash
   curl http://localhost:5000/api/overview
   ```

2. **Check MongoDB Connection**:
   - Backend should log: `✅ Connected to MongoDB: recommendation_db`
   - If you see errors, check your `MONGODB_URL` in `.env`

3. **Test from Browser**:
   - Open browser console
   - Check Network tab for API calls
   - Verify they're going to the correct backend URL

## Quick Start Checklist

- [ ] Backend server deployed and running
- [ ] Environment variables set (especially `MONGODB_URL` and `MONGODB_DB`)
- [ ] Backend URL accessible (test with `curl` or browser)
- [ ] Frontend configured with `VITE_API_URL` (if backend is separate)
- [ ] Frontend rebuilt with correct API URL
- [ ] CORS configured (if backend is on different domain)
- [ ] API proxy configured (if using same domain)

## Troubleshooting

### Backend won't start
- Check MongoDB connection string is correct
- Verify all environment variables are set
- Check Node.js version (requires Node 20+)
- Review server logs for errors

### API calls return 404
- Verify backend is running and accessible
- Check API URL in frontend matches backend URL
- Verify API routes are registered correctly

### API calls return CORS errors
- Add CORS middleware to backend
- Configure allowed origins correctly
- Check browser console for specific CORS error

### Database connection fails
- Verify MongoDB connection string format
- Check MongoDB Atlas IP whitelist (if using Atlas)
- Verify database name is correct
- Check network connectivity to MongoDB

