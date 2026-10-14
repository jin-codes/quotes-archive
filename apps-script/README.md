# Apps Script backend setup

1. Create a Google Sheet. Rename the first tab to `quotes` and import `quotes-seed.csv` into it
   (File → Import → Replace current sheet; keep the header row).
2. Extensions → Apps Script. Paste `Code.gs`.
3. Project Settings → Script properties:
   - `GOOGLE_CLIENT_ID`: OAuth *Web* client id (Google Cloud Console → APIs & Services → Credentials;
     add your site origin, e.g. `https://quotes-archive.vercel.app` and `http://localhost:3000`, to Authorized JavaScript origins)
   - `ADMIN_EMAILS`: comma separated admin emails
   - `SESSION_SECRET`: a long random string
4. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**. Copy the `/exec` URL.
5. Set in `.env.local` and in Vercel project env vars:
   ```
   VITE_APPS_SCRIPT_URL=<the /exec url>
   VITE_GOOGLE_CLIENT_ID=<the same client id>
   ```
   After changing `Code.gs`, redeploy with **Manage deployments → Edit → New version**.
