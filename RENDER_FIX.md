# Fix for Render Build Error: "tsx: not found"

## Problem
Render is failing with: `sh: 1: tsx: not found`

## Solution

The issue is that `tsx` (a dev dependency) might not be available during the build. Here are the fixes:

### Option 1: Update Render Build Command (Recommended)

In your Render dashboard:

1. Go to your service → **Settings**
2. Find **Build Command**
3. Change it to:
   ```bash
   npm ci && npm run build
   ```

The `npm ci` ensures all dependencies (including devDependencies) are installed before building.

### Option 2: Use npx (Already Fixed in package.json)

The `package.json` has been updated to use `npx tsx` which should work, but you still need to ensure dependencies are installed.

### Option 3: Manual Build Command

If the above doesn't work, use this build command in Render:

```bash
npm install && npm run build
```

## Updated Files

1. **package.json**: Changed `build` script to use `npx tsx`
2. **render.yaml**: Updated build command to `npm ci && npm run build`

## Steps to Fix on Render

1. **Go to Render Dashboard** → Your Service → **Settings**

2. **Update Build Command** to:
   ```
   npm ci && npm run build
   ```

3. **Save and Redeploy**

4. **Alternative**: If `npm ci` doesn't work, try:
   ```
   npm install && npm run build
   ```

## Why This Happens

- Render might be using `npm install --production` which skips devDependencies
- `tsx` is in `devDependencies` but needed for the build
- `npm ci` installs all dependencies including devDependencies

## Verify Fix

After updating, the build should:
1. Install all dependencies (including `tsx`)
2. Run the build script successfully
3. Create `dist/index.cjs` and `dist/public/` files

If you still get errors, check the Render logs for more details.

