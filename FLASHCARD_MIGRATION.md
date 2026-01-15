# Flashcard Data Migration Guide

This guide walks you through moving `flashcards.json` from the public repo to Cloudflare R2 with a Worker proxy for CORS protection.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Kim Bar Game   │────▶│  Cloudflare Worker   │────▶│  Cloudflare R2  │
│ (badgey.org)    │     │  (flashcard-api)     │     │  (private)      │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                               │
                               ▼
                        CORS Check:
                        ✓ badgey.org
                        ✓ flashcards.badgey.org
                        ✓ kimbar.badgey.org
                        ✗ evil-scraper.com
```

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed (`npm i -g wrangler`)
- Cloudflare account with Workers & R2 enabled
- Logged into Wrangler: `wrangler login`

---

## Step 1: Create the R2 Bucket

```bash
# Create the bucket (run from anywhere)
wrangler r2 bucket create kimbar-flashcards
```

## Step 2: Upload Flashcard Data to R2

```bash
# From the kimbar repo root
wrangler r2 object put kimbar-flashcards/flashcards.json \
  --file public/content/cards/flashcards.json
```

Verify the upload:
```bash
wrangler r2 object list kimbar-flashcards
```

## Step 3: Deploy the Cloudflare Worker

```bash
# Navigate to the worker directory
cd workers/flashcard-api

# Install dependencies
npm install

# Set the allowed origins secret (production)
wrangler secret put ALLOWED_ORIGINS --env production
# When prompted, enter: https://badgey.org,https://flashcards.badgey.org,https://kimbar.badgey.org,https://kimbar.pages.dev

# Deploy to production
npm run deploy
```

Note the deployed URL (e.g., `https://flashcard-api.YOUR-SUBDOMAIN.workers.dev`).

### Test the Worker

```bash
# Should return flashcard data (no CORS headers since no Origin)
curl https://flashcard-api.YOUR-SUBDOMAIN.workers.dev/flashcards | head -c 500

# Should return 403 (wrong origin)
curl -H "Origin: https://evil.com" https://flashcard-api.YOUR-SUBDOMAIN.workers.dev/flashcards

# Should work (correct origin)
curl -H "Origin: https://badgey.org" https://flashcard-api.YOUR-SUBDOMAIN.workers.dev/flashcards | head -c 500
```

## Step 4: Configure GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to: `https://github.com/abobilly/kimbar/settings/secrets/actions`
2. Add repository secret:
   - **Name:** `VITE_FLASHCARD_API_URL`
   - **Value:** `https://flashcard-api.YOUR-SUBDOMAIN.workers.dev/flashcards`

You should already have:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Step 5: Remove Flashcard Data from Git History

**IMPORTANT:** Do this BEFORE making the repo public!

### Option A: Simple removal (recommended if history isn't critical)

```bash
# Make sure you have a backup of flashcards.json!
cp public/content/cards/flashcards.json ~/flashcards-backup.json

# Remove from git tracking (file stays locally)
git rm --cached public/content/cards/flashcards.json
git commit -m "Remove flashcards.json from version control"

# Push
git push origin main
```

### Option B: Full history rewrite (removes from all commits)

```bash
# Backup first!
cp public/content/cards/flashcards.json ~/flashcards-backup.json

# Use git-filter-repo (install: pip install git-filter-repo)
git filter-repo --path public/content/cards/flashcards.json --invert-paths

# Force push (requires re-adding remote)
git remote add origin https://github.com/abobilly/kimbar.git
git push origin main --force
```

⚠️ **Warning:** Option B rewrites history. All collaborators will need to re-clone.

## Step 6: Verify Everything Works

1. **Trigger a fresh deploy:**
   ```bash
   git commit --allow-empty -m "Trigger deploy after flashcard migration"
   git push origin main
   ```

2. **Check the deployed site:**
   - Open https://kimbar.badgey.org (or your domain)
   - Open browser DevTools → Network tab
   - Play the game until you hit a flashcard encounter
   - Verify the request goes to your Worker URL
   - Verify flashcards load correctly

3. **Verify data is private:**
   - Try accessing `https://kimbar.badgey.org/content/cards/flashcards.json` → Should 404
   - Try `curl https://flashcard-api.YOUR.workers.dev/flashcards -H "Origin: https://evil.com"` → Should 403

## Step 7: Make the Repo Public

Once verified:

1. Go to: `https://github.com/abobilly/kimbar/settings`
2. Scroll to "Danger Zone"
3. Click "Change visibility" → Public

---

## Local Development

For local development, the game will continue to use the local file if:
1. `VITE_FLASHCARD_API_URL` is not set, AND
2. `public/content/cards/flashcards.json` exists locally

Keep a local copy of `flashcards.json` for development:
```bash
# One-time download from R2 for local dev
wrangler r2 object get kimbar-flashcards/flashcards.json \
  --file public/content/cards/flashcards.json
```

The file is in `.gitignore` so it won't be committed.

---

## Updating Flashcard Content

When you need to update the flashcard data:

```bash
# Upload new version to R2
wrangler r2 object put kimbar-flashcards/flashcards.json \
  --file /path/to/new/flashcards.json

# The Worker caches for 5 minutes, so changes appear within 5 min
# Or redeploy the worker to clear the cache:
cd workers/flashcard-api && npm run deploy
```

---

## Cost Analysis

### Cloudflare R2
- **Storage:** First 10 GB free, then $0.015/GB/month
- **Egress:** Always free (no bandwidth charges!)
- **Operations:** 1M Class A (write) free, 10M Class B (read) free

### Cloudflare Workers
- **Requests:** 100,000/day free
- **CPU time:** 10ms/request free tier

**Estimated monthly cost for Kim Bar: $0** (well within free tiers)

---

## Troubleshooting

### Flashcards not loading in production
1. Check browser console for errors
2. Verify `VITE_FLASHCARD_API_URL` is set in GitHub secrets
3. Check the Worker logs: `cd workers/flashcard-api && npm run tail`

### CORS errors in browser
1. Verify your domain is in `ALLOWED_ORIGINS`
2. Check exact origin (including protocol): `https://` vs `http://`
3. Update the secret: `wrangler secret put ALLOWED_ORIGINS --env production`

### 403 Forbidden from Worker
- The Origin header doesn't match the allowlist
- Add the domain to `ALLOWED_ORIGINS` secret

### Local development uses wrong URL
- Make sure `.env.local` doesn't set `VITE_FLASHCARD_API_URL`
- Or set it to empty: `VITE_FLASHCARD_API_URL=`

---

## Security Notes

1. **CORS is not foolproof:** Determined scrapers can bypass it by not sending Origin headers or using server-side requests. This solution raises the bar significantly but isn't absolute.

2. **For stronger protection,** consider:
   - Rate limiting in the Worker
   - API key authentication (would require code changes)
   - Cloudflare Access (requires Cloudflare subscription)

3. **The R2 bucket is private by default.** Only the Worker can read from it.

---

## Files Changed

| File | Change |
|------|--------|
| `workers/flashcard-api/*` | New Worker for serving flashcards |
| `src/content/registry.ts` | Added `VITE_FLASHCARD_API_URL` support |
| `src/vite-env.d.ts` | Added type for new env var |
| `.github/workflows/deploy.yml` | Added env var to build step |
| `.gitignore` | Added `public/content/cards/flashcards.json` |
| `.env.local.example` | Documented new env var |
