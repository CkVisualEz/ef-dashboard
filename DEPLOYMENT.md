# Deployment Guide for EF-Dashboard

## Issue: Dashboard Not Accessible at https://www.visualez.com/EF-Dashboard

The dashboard needs to be configured for subdirectory deployment. Here's how to fix it:

## Step 1: Rebuild the Application

After the code changes, rebuild the application:

```bash
npm run build
```

This will create a new build in `dist/public` with the correct base path configuration.

## Step 2: Upload Files

Upload all files from `dist/public` to `https://www.visualez.com/EF-Dashboard/`

**Important**: Make sure the folder structure is:
```
EF-Dashboard/
  ├── index.html
  ├── assets/
  │   ├── index-*.js
  │   └── index-*.css
  ├── favicon.png
  └── opengraph.jpg
```

## Step 3: Server Configuration

### For Apache (.htaccess)

Create a `.htaccess` file in the `EF-Dashboard` directory with:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /EF-Dashboard/
  
  # Handle API requests (if backend is on same domain)
  RewriteCond %{REQUEST_URI} ^/EF-Dashboard/api/
  RewriteRule ^api/(.*)$ /api/$1 [L]
  
  # Handle static assets
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Fallback to index.html for SPA routing
  RewriteRule ^ index.html [L]
</IfModule>
```

### For Nginx

Add this configuration:

```nginx
location /EF-Dashboard {
  alias /path/to/EF-Dashboard;
  try_files $uri $uri/ /EF-Dashboard/index.html;
  
  # Handle API requests (if backend is on same domain)
  location /EF-Dashboard/api {
    proxy_pass http://your-backend-server/api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

## Step 4: Backend API Configuration

**CRITICAL**: The dashboard requires a **backend API server** to be running. Static files alone won't work!

### Quick Solution: Deploy Backend Separately

1. **Deploy Backend to a Node.js Hosting Service** (Recommended):
   - **Railway**: https://railway.app (easiest, free tier)
   - **Render**: https://render.com (free tier available)
   - **Heroku**: https://heroku.com
   
   See `BACKEND_DEPLOYMENT.md` for detailed instructions.

2. **Set Environment Variables on Hosting Service**:
   ```env
   MONGODB_URL=your_mongodb_connection_string
   MONGODB_DB=recommendation_db
   NEW_FEATURES_COLLECTION=analytics
   NEW_PRODUCTS_COLLECTION=ef_products
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=your-secret-key
   ```

3. **Get Your Backend URL** (e.g., `https://your-app.railway.app`)

4. **Rebuild Frontend with Backend URL**:
   ```bash
   VITE_API_URL=https://your-app.railway.app npm run build
   ```
   
   Or create a `.env` file in the root:
   ```env
   VITE_API_URL=https://your-app.railway.app
   ```
   Then rebuild: `npm run build`

5. **Upload New Build** to `https://www.visualez.com/EF-Dashboard/`

### Alternative: API Proxy on Same Server

If you have Node.js access on your server, you can:
1. Run the backend on the same server
2. Configure Apache/Nginx to proxy `/EF-Dashboard/api/*` to `http://localhost:5000/api/*`

See `BACKEND_DEPLOYMENT.md` for detailed proxy configuration.

## Step 5: Verify Deployment

1. Visit `https://www.visualez.com/EF-Dashboard/`
2. Check browser console for any errors
3. Verify API calls are working (check Network tab)

## Common Issues

### Issue: 404 on page refresh
**Solution**: Ensure your server is configured to serve `index.html` for all routes (see Step 3)

### Issue: Assets not loading (404 on JS/CSS files)
**Solution**: 
- Verify the `base` path in `vite.config.ts` is set to `/EF-Dashboard/`
- Rebuild the application
- Check that asset paths in `index.html` are correct

### Issue: API calls failing
**Solution**: 
- Ensure backend server is running and accessible
- Configure CORS on backend to allow requests from your domain
- Set up API proxy on web server (see Step 4)

### Issue: Blank page
**Solution**:
- Check browser console for JavaScript errors
- Verify all files are uploaded correctly
- Check that `index.html` is in the root of `EF-Dashboard` folder

## Environment Variables

If you need to change the base path, set the `BASE_PATH` environment variable before building:

```bash
BASE_PATH=/EF-Dashboard/ npm run build
```

Or update `vite.config.ts` directly.

