# Deploy Sway to Vercel

Get Sway live on the internet in 10 minutes. Vercel is free for personal projects.

---

## Step 1 — Push your code to GitHub

If you haven't already:

```bash
cd ~/sway
git init
git add .
git commit -m "Initial commit"
```

Then create a new repository on GitHub (call it `sway`) and follow the instructions GitHub gives you to push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/sway.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Sign up to Vercel

1. Go to **[vercel.com](https://vercel.com)**
2. Click **Sign Up** → choose **Continue with GitHub**
3. Authorise Vercel to access your repos

---

## Step 3 — Import your project

1. On the Vercel dashboard, click **Add New → Project**
2. Find your `sway` repo → click **Import**
3. Vercel auto-detects Next.js — leave all defaults
4. Click **Deploy**

It builds in about 1–2 minutes. You'll get a URL like `sway-xyz.vercel.app`.

---

## Step 4 — Add Vercel's domain to Firebase

Your Google login won't work on the new URL until you authorise it:

1. **Firebase Console** → **Authentication** → **Settings** → **Authorised Domains**
2. Click **Add domain**
3. Paste your Vercel URL (e.g. `sway-xyz.vercel.app`) — without `https://`
4. Save

---

## Step 5 — Test the live app

Open your Vercel URL in a browser. Sign in with Google. Create a post. If everything works → 🎉

If Google login fails with `auth/unauthorized-domain` → go back to Step 4.

---

## Step 6 — Add a custom domain (optional)

1. Buy a domain on **Namecheap** or **Cloudflare** (~€10/year)
2. In Vercel → your project → **Settings** → **Domains**
3. Add your domain (e.g. `sway.app`)
4. Follow Vercel's DNS instructions — usually adding an A record or CNAME at your registrar
5. Wait 5–30 minutes for DNS to propagate
6. Add the new domain to Firebase Authorised Domains too

Once live, update `SITE_URL` in `app/layout.tsx` and `app/sitemap.ts` from `https://sway.app` to your real domain.

---

## Step 7 — Auto-deploy on every commit

Vercel automatically redeploys whenever you push to GitHub:

```bash
git add .
git commit -m "Updated something"
git push
```

That's it — Vercel rebuilds and pushes the new version live in ~1 minute.

---

## Common deployment issues

**Build fails with TypeScript errors:** Vercel runs strict checks. Either fix the errors or make sure `next.config.ts` has:
```ts
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```

**Firebase auth doesn't work:** Forgot Step 4. Add the domain to authorised list.

**Images don't load:** Make sure your `next.config.ts` includes:
```ts
images: { domains: ["lh3.googleusercontent.com"] }
```

**Environment variables:** If you ever move Firebase config to env vars, set them in **Vercel → Settings → Environment Variables**, then redeploy.

---

## Performance tips

- Vercel's free tier is fine for thousands of users
- Firestore is the bottleneck, not hosting — watch Firebase usage in the console
- Add Vercel Analytics (free) → Settings → Analytics → Enable
