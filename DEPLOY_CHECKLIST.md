# Vercel Deployment Checklist

## Required Files for Vercel:

✅ **Core Files:**
- `index.html` 
- `script.js` (updated version)
- `styles.css`
- `book-structure.json` ⬅️ **CRITICAL - This file MUST be deployed**

✅ **Content:**
- `book1/` (entire directory with all chapters C1-C6 and sections)

## Deployment Steps:

1. **Verify local files exist:**
   ```bash
   ls -la | grep -E "\.(json|html|js|css)$"
   ```
   Should show: book-structure.json, index.html, script.js, styles.css

2. **Test locally first:**
   - Run `python3 server.py`
   - Open http://localhost:8000
   - Check browser console for: "✅ Loaded book structure from static file"

3. **Deploy to Vercel:**
   - Push ALL files to your GitHub repository
   - Ensure `book-structure.json` is in the root directory
   - Redeploy on Vercel

4. **Verify deployment:**
   - Visit your Vercel URL
   - Open browser console (F12)
   - Look for console messages about book structure loading

## If Still Not Working:

1. **Check file exists on Vercel:**
   - Try accessing: `https://YOUR-VERCEL-URL/book-structure.json` directly
   - Should show the JSON content, not 404

2. **Check GitHub repository:**
   - Verify `book-structure.json` is committed and pushed
   - Check file size (should be ~26KB with all chapters)

3. **Force redeploy:**
   - In Vercel dashboard, trigger a new deployment
   - Or push a small change to trigger rebuild

## Current Status Check:
- Local files: ✅ All files present
- book-structure.json: ✅ 26KB file exists locally
- Next step: Deploy to Vercel and verify the JSON file is accessible