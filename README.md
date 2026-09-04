# Exampen — app.exampen.co

A private course platform:
- Students log in and see ALL courses. Enrolled ones are clickable; locked ones just show a thumbnail + 🔒.
- Video is never sent to the browser unless the server has already checked (in the database) that this exact user is enrolled in this exact course.
- Admin panel to create logins, add courses, and grant/revoke access per user.

Stack: Next.js + Supabase (auth + database) + Bunny Stream (video). Hosted on Vercel, DNS stays on Hostinger.

---

## 1. Create the Supabase project (free)

1. Go to supabase.com → New project. Pick any name/region, save the DB password somewhere.
2. Once it's created, go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` from this project → Run. This also creates a public `thumbnails` storage bucket for course cover images — nothing extra to set up for that.
3. Go to **Project Settings → API**. You'll need 3 values for the next step:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (click reveal) → `SUPABASE_SERVICE_ROLE_KEY` — **never share this one or put it in client code**, it's only used server-side to create logins.
4. Go to **Authentication → Providers** and make sure Email is enabled. Go to **Authentication → Settings** and turn OFF "Enable email confirmations" (since the admin creates accounts directly, no one needs to click a confirmation email).

## 2. Set up Bunny Stream (you already have the subscription)

1. In your Bunny dashboard, go to **Stream** → create a **Video Library** if you haven't (e.g. "Exampen Courses"). Note the **Library ID** shown at the top → this is `BUNNY_LIBRARY_ID`.
2. Click into the library → **API** tab → copy the **API Key** → this is `BUNNY_STREAM_API_KEY`. This is what lets your admin panel *read the list of videos* from Bunny directly — you won't need to copy-paste any video IDs by hand.
3. Still inside the library → **Security** tab → turn ON **Token Authentication**. This is what stops anyone from playing your videos without going through your app. Copy the **Token Authentication Key** → this is `BUNNY_TOKEN_AUTH_KEY`.
4. Same library → find its **Pull Zone hostname** (Bunny creates one automatically per Stream library — it looks like `vz-xxxxxxxx-abc.b-cdn.net`; you'll see it in the library's overview/embed settings, or in the URL when you preview a video). Copy just the hostname (no `https://`) → this is `NEXT_PUBLIC_BUNNY_PULL_ZONE`. It's used to pull thumbnails into the admin panel.
5. Upload your course videos: Library → Videos → Upload. Bunny encodes them automatically — that's the only manual step left, everything else happens inside your admin panel now (see "Publishing a course" below).

## 3. Deploy the app on Vercel (free)

1. Push this project to a GitHub repo (or drag-and-drop the folder into vercel.com/new — it also supports direct upload).
2. On vercel.com → New Project → import the repo.
3. In the "Environment Variables" step, add every variable from `.env.local.example` with your real values (Supabase 3 values + Bunny 3 values). Leave `NEXT_PUBLIC_BUNNY_PULL_ZONE` blank if you're not using it directly.
4. Deploy. You'll get a URL like `exampen-app.vercel.app` — confirm it works (try logging in once you've created a user, step 5 below).

## 4. Point app.exampen.co at it (DNS stays on Hostinger)

1. In Vercel → your project → **Settings → Domains** → add `app.exampen.co`. Vercel will show you a CNAME record to create.
2. Log into Hostinger → your domain's **DNS / Nameservers** section → add a new **CNAME record**:
   - Name/Host: `app`
   - Points to: whatever Vercel gave you (usually `cname.vercel-dns.com`)
   - TTL: default
3. Wait 10–30 minutes for DNS to propagate. Vercel will auto-issue an SSL certificate once it sees the record.

## 5. Create your first admin login

1. Visit your deployed app → you won't be able to sign up (there's no public signup form, on purpose). Instead, temporarily go to Supabase → **Authentication → Users → Add user** and create yourself an account with an email + password (check "Auto Confirm User").
2. Go to Supabase → **SQL Editor** and run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Now log into `app.exampen.co` with that email/password — you'll see an "Admin panel" button in the top bar.
4. From here on, create every other user (students) directly from the Admin panel → Users tab. You don't need to touch Supabase again for day-to-day use.

## Everyday use after setup

**Publishing a course (a course = a folder; enrolling someone gives them the whole folder, and it auto-updates when you add more videos):**
1. Upload your video(s) in the Bunny dashboard as usual.
2. Admin panel → **Courses** tab → **Create course** — give it a title, description, and upload a cover image (drag/drop or choose file, right in the form).
3. Admin panel → **Bunny Library** tab → your uploaded videos show up automatically with their thumbnails → pick the course from the dropdown under each video → click **Attach**. Repeat for every lesson video that belongs to that course.
4. Back in the **Courses** tab you'll see the lesson count per course, and can remove a lesson if you attached the wrong one.

- **Create a student login**: Admin panel → Users tab → set them a temporary password (tell them to note it — there's no "forgot password" flow yet, that's a fast follow-up if you want it).
- **Give/remove access**: Admin panel → Assign access tab → click Grant/Enrolled per user per course — this unlocks *all* lessons in that course at once.

## Security notes
- The video URL is generated with a 2-hour expiring signed token, produced server-side, only after checking the `enrollments` table — so even a technical user inspecting the page can't get a working link to a course they're not enrolled in, and any link they do see expires quickly.
- The `service_role` Supabase key must only ever live in Vercel's environment variables, never in the browser bundle — this project is already structured so it's only used inside `/api/admin/*` server routes.



