# Farmer Queue — Cloudflare + Supabase

A multi-file, mobile-friendly prototype using HTML/CSS/JavaScript, Supabase Auth and PostgreSQL. It is designed to deploy as static assets on Cloudflare Pages or Cloudflare Workers Static Assets from GitHub.

## Files
- `index.html` — page structure
- `styles.css` — responsive visual design
- `config.js` — Supabase URL + publishable/anon key
- `app.js` — authentication, bookings, history, staff view and receipts
- `supabase/schema.sql` — tables, RLS policies, profile trigger, and transactional booking function
- `wrangler.toml` — optional Cloudflare Workers Static Assets config

## 1. Create Supabase database
1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor → New query**.
3. Paste all of `supabase/schema.sql` and click **Run**.
4. Open **Project Settings → API** (or **Connect**) and copy the Project URL and publishable/anon key.
5. Put them into `config.js`. Use only the publishable/anon key in browser code. NEVER use the `service_role` key or database password in GitHub/frontend files.
6. In Supabase Authentication settings, configure your site's Site URL and Redirect URLs after deployment. For quick demo testing, turn email confirmation off only if you understand the trade-off; otherwise confirm signup from email.
7. After creating your account, make a staff user by running this in SQL Editor, replacing the email:
   `update public.profiles p set role='staff' from auth.users u where p.id=u.id and u.email='YOUR_STAFF_EMAIL@example.com';`
   Never expose staff-role changes to public signup.

## 2. Test locally
Because Auth redirects/camera features work best on localhost/HTTPS, use VS Code Live Server or:
- Install Node.js LTS.
- In this folder run `npx serve .` (or `python -m http.server 8080`).
- Open the local URL it prints.
- First set the Supabase values in `config.js`.

## 3. Deploy from GitHub to Cloudflare Pages (simplest)
1. Create a GitHub repository and upload the contents of this folder (make sure `index.html` is at the repository root).
2. In Cloudflare dashboard open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository. Framework preset: **None**. Build command: leave blank. Build output directory: `/` (or `.` as accepted by the dashboard).
4. Deploy and open the provided `*.pages.dev` URL.
5. In Supabase Auth URL configuration, add that exact deployed URL as Site URL and Redirect URL, then redeploy if needed.

## 4. Or Cloudflare Worker Static Assets
`wrangler.toml` is included. Install Node.js, then run:
`npx wrangler login`
`npx wrangler deploy`
Run it from this directory. This deploys static assets using Workers Static Assets; connect GitHub deployments in Cloudflare if you prefer automatic deploys.

## Important limitations / security
- The browser key is expected to be public; database safety comes from RLS. Do not disable RLS.
- Do not commit a service-role key, database password, or private secrets.
- Staff role is assigned manually in SQL. Keep staff dashboard accounts private.
- The UI currently uses a QR image service to render tokens; internet access is needed to show QR images.
- This is a student demo starter, not a security-audited production system. Review auth redirect settings, policies, staff workflows, and privacy obligations before using real farmers' personal data.
- For the presentation, demonstrate signup/login, create booking, show token and history, and log in as the separately configured staff account to show the dashboard.
