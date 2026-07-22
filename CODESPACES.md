# ROUTY Codespaces development

## Repository secrets

Add these Codespaces secrets before creating a codespace:

- `NEXT_PUBLIC_SUPABASE_URL`: ROUTY Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe Supabase anon key
- `NEXT_PUBLIC_SUPABASE_POST_IMAGE_BUCKET`: optional; omit to use `post-images`

Do not add a Supabase service-role key. `.env.local` remains ignored. For local-only
testing inside a codespace, copy `.env.example` to `.env.local` and fill it without
committing the file.

## Start from a phone

1. Open the repository on GitHub and choose **Code > Codespaces > Create codespace**.
2. Wait for the container setup to finish. It runs `npm ci` automatically.
3. Open the Codespaces terminal and run:

   ```bash
   npm run dev -- --hostname 0.0.0.0
   ```

4. Open the forwarded port notification, or open the **Ports** view and select port
   `3000`. Keep its visibility private.
5. Use the browser editor and terminal to edit files and run:

   ```bash
   npm run lint
   npm run build
   git status
   ```

6. Commit and push only when the intended diff has been reviewed.

Google login from a Codespaces preview also requires its generated
`https://<codespace>-3000.app.github.dev` callback/origin to be permitted by the
ROUTY Supabase Auth redirect URL configuration. This repository setup does not change
Supabase configuration.

## Linux note

Normal development does not require `scripts/generate-pwa-icons.ps1`. That script uses
Windows PowerShell and `System.Drawing`, so it is not expected to run in the Linux
Codespaces container. Existing generated icons are already stored under `public/`.
