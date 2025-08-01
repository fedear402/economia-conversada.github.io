# GitHub API Setup for Shared Data

## Why The GitHub API Was Failing

The original approach failed because:

1. **Authentication Required**: GitHub now requires authentication for API writes, even to public repositories
2. **CORS Issues**: Browsers block direct API calls from websites to GitHub for security
3. **Rate Limits**: Anonymous API requests have very low rate limits

The 404 errors you saw were GitHub's way of saying "authentication required" rather than "file not found."

## New Solution: Vercel Serverless Proxy

I've created a serverless function (`/api/github-proxy.js`) that:
- Runs on Vercel's servers (no CORS issues)
- Uses your GitHub Personal Access Token securely
- Handles both file creation and updates
- Provides proper error handling

## Setup Steps (Required)

### 1. Create GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" → "Classic"
3. Set expiration to "No expiration" (or 1 year)
4. Select these scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `public_repo` (Access public repositories)
5. Click "Generate token"
6. **COPY THE TOKEN** - you won't see it again!

### 2. Add Token to Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project (`economia-conversada.github.io`)
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: Paste your token from step 1
   - **Environment**: Select all (Production, Preview, Development)
5. Click "Save"

### 3. Deploy Changes

```bash
git push
```

Vercel will automatically redeploy with the new serverless function.

## How It Works Now

**User Action Flow:**
1. User deletes/marks/comments on a file
2. Frontend calls `/api/github-proxy` (Vercel function)
3. Serverless function authenticates with GitHub using your token
4. GitHub API updates the JSON file in your repository
5. File change triggers automatic Vercel redeployment
6. All users see the updated data immediately

**Data Files:**
- `deleted_files_history.json` - deleted files
- `completed_files.json` - files marked as OK
- `file_comments.json` - user comments
- `not_completed_files.json` - files marked as NOT OK

## Testing After Setup

1. Push your changes and wait for Vercel deployment
2. Visit your website
3. Delete a file - check console for "Successfully updated..." messages
4. Reload page - deleted file should stay deleted
5. Open in incognito/different browser - should see same deleted files

## Troubleshooting

**"GitHub token not configured" error:**
- Check Vercel environment variables
- Make sure `GITHUB_TOKEN` is set in Production environment
- Redeploy after adding environment variable

**Still getting 404s:**
- Check GitHub token permissions (needs `repo` scope)
- Verify repository name in `api/github-proxy.js` matches your repo

**Files not syncing:**
- Check Network tab in browser dev tools
- Look for successful POST to `/api/github-proxy`
- Check your GitHub repository for automatic commits

## Benefits

✅ **True Anonymous Sharing**: Anyone can modify data, everyone sees changes  
✅ **No Rate Limits**: Uses your authenticated GitHub account  
✅ **Automatic Backups**: All changes stored in Git history  
✅ **Zero Additional Cost**: Uses existing Vercel + GitHub setup  
✅ **Secure**: Token stored safely in Vercel environment variables  

## Next Steps

1. Complete the setup above
2. Push this commit
3. Test the functionality
4. All users will now share the same data instantly!