# Deploying to Vercel — 3 minutes

The production build is verified working (`next build` passes, 19 routes). Vercel auto-detects Next.js, so there is nothing to configure.

## Option A — Vercel CLI (fastest)

```bash
unzip SIH26102-MPLAD-INTELLIGENCE.zip
cd SIH26102-MPLAD-INTELLIGENCE
npm install
npx vercel login      # pick GitHub / Google / Email, confirm in browser
npx vercel --prod     # press Enter to accept every default
```

It prints your public URL, e.g. `https://mplad-intelligence.vercel.app`.

**Defaults to accept when prompted:**

| Prompt | Answer |
|---|---|
| Set up and deploy? | `y` |
| Which scope? | your personal account |
| Link to existing project? | `n` |
| Project name? | press Enter (or type `mplad-intelligence`) |
| In which directory is your code? | press Enter (`./`) |
| Modify build settings? | `n` |

No environment variables are required. The app runs entirely on the bundled real data.

## Option B — GitHub + Vercel dashboard (no CLI)

1. Create a new repo on github.com and push this folder:
   ```bash
   git init && git add -A && git commit -m "MPLAD Intelligence — SIH26102"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Go to vercel.com → **Add New… → Project** → import that repo.
3. Framework preset will show **Next.js**. Click **Deploy**. Done.

## Optional — pull fresh data before deploying

The sandbox that built this had no internet access to the data source, so it used the bundled real snapshot. On your machine (open network) you can refresh it live:

```bash
npm run ingest        # 16th Lok Sabha — fetches the full set from the CKAN API
npm run ingest:17     # 17th Lok Sabha (current term)
```

Then redeploy. This is also how you get the remaining ~180 MPs that the bundled snapshot doesn't include.

## Troubleshooting

- **`vercel: command not found`** → use `npx vercel` (as above), or `npm i -g vercel`.
- **Build fails on Vercel** → confirm Node 18+ in Project Settings → General → Node.js Version.
- **Blank page after deploy** → hard-refresh; check the Vercel deployment log's Build Output section.

## Already-live alternative

You already have a working public deployment that needs no setup: the hosted page at
`https://claude.ai/code/artifact/8cde038d-1a0a-4147-b7f6-7e1d03a0acea`
(turn on link sharing from the page's Share menu). Vercel is only needed if you want a
conventional `.vercel.app` domain plus the server-side API routes and the Leaflet map.
