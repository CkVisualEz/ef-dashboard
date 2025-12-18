# How to Build Frontend with Backend URL

## Current Directory
You should be in: `c:\ef color match\EF-ColorMatch\`

This is the **root directory** where `package.json` is located.

## Option 1: Build with Environment Variable (One-time)

### Windows PowerShell:
```powershell
$env:VITE_API_URL="https://ef-dashboard-api.onrender.com"; npm run build
```

### Windows Command Prompt (CMD):
```cmd
set VITE_API_URL=https://ef-dashboard-api.onrender.com && npm run build
```

### Git Bash / WSL:
```bash
VITE_API_URL=https://ef-dashboard-api.onrender.com npm run build
```

## Option 2: Create .env File (Recommended - Reusable)

1. **Create a `.env` file** in the root directory (`c:\ef color match\EF-ColorMatch\.env`)

2. **Add this line:**
   ```env
   VITE_API_URL=https://ef-dashboard-api.onrender.com
   ```

3. **Then just run:**
   ```bash
   npm run build
   ```

The `.env` file will be automatically used by Vite, so you don't need to set the variable each time.

## Step-by-Step Instructions

### Step 1: Open Terminal/PowerShell
- Navigate to: `c:\ef color match\EF-ColorMatch\`
- Or right-click in the folder → "Open in Terminal"

### Step 2: Choose Your Method

**Method A - Quick (One-time):**
```powershell
$env:VITE_API_URL="https://ef-dashboard-api.onrender.com"; npm run build
```

**Method B - Reusable (.env file):**
1. Create `.env` file in root
2. Add: `VITE_API_URL=https://ef-dashboard-api.onrender.com`
3. Run: `npm run build`

### Step 3: Wait for Build
- Build will take 1-2 minutes
- Output will be in `dist/public/`

### Step 4: Upload Files
- Upload everything from `dist/public/` to your server at `https://www.visualez.com/EF-Dashboard/`

## Important Notes

1. **Replace the URL**: Use your actual backend URL from Render/Railway/etc.
   - Example: `https://your-app-name.onrender.com`
   - Example: `https://your-app.up.railway.app`

2. **No trailing slash**: Don't add `/` at the end
   - ✅ Correct: `https://ef-dashboard-api.onrender.com`
   - ❌ Wrong: `https://ef-dashboard-api.onrender.com/`

3. **.env file location**: Must be in the **root directory** (same folder as `package.json`)

4. **After build**: Check `dist/public/index.html` - it should reference the correct API URL

## Troubleshooting

### Build fails
- Make sure you're in the root directory (`c:\ef color match\EF-ColorMatch\`)
- Check that `package.json` exists in current directory
- Run `npm install` first if needed

### API URL not working
- Check browser console (F12) for API errors
- Verify backend is running and accessible
- Test backend URL directly: `https://your-backend-url.com/api/overview`

### .env file not working
- Make sure file is named exactly `.env` (not `.env.txt`)
- File must be in root directory (same as `package.json`)
- Restart terminal after creating `.env` file

