# Google Drive backup setup

This change replaces the old manual-upload instructions with real browser-to-Drive uploads. It works with the static Vercel deployment and does not send video bytes through Vercel functions. Existing PC streaming and catalog files remain unchanged.

## One-time owner setup

1. In the intended Google Cloud project, enable **Google Drive API**.
2. Configure Google Auth Platform consent. While the app is in Testing, add `instruasia@gmail.com` under Audience / Test users. Publish and complete Google's verification requirements if required for ongoing production use of the Drive scope.
3. Create your own **Web application** OAuth client. Add `https://nunes-product-videos.vercel.app` as an **Authorized JavaScript origin**, plus localhost if testing locally. This popup token flow does not use a server callback.
4. Set `VITE_GOOGLE_CLIENT_ID` in the existing Vercel project's production build environment and redeploy, or enter the public client ID in the site's Drive settings. Never add a client secret or password to this frontend.
5. Click **Connect Drive**, select `instruasia@gmail.com`, and grant Drive access. The app checks Google's reported account before accessing the destination folders.
6. Confirm the root folder and paste your existing separate Photos and Videos folder links. When left blank, named folders are found or created inside the root. If a name is ambiguous, use the exact folder link. Folder permissions are validated.

The screenshot's `accounts.reauth` scope belongs to a different authorization request (the Google Cloud SDK client). This application does not request it or reuse that client. It requests only the standard Drive scope, necessary here for accessing the owner's already-existing folders. Do not edit a Google Cloud SDK login URL to use it as this application's connection.

## Usage

- New Add Photo / Add Video uploads go directly to Drive and appear only after a successful metadata/size verification.
- **Back up existing media** processes original files sequentially, records per-file success/failure, and skips identities already in the selected Drive folders. Existing videos require the original PC server online; repository thumbnails are not substitutes for videos.
- **Stop after current file** safely stops the batch. Re-run backup to retry failed or remaining files. For a failed new upload, keep the original file selected and retry; upload IDs help prevent duplicates after an ambiguous response.
- **Refresh Drive media** reads photos/videos directly in the two selected folders with pagination. The catalog reappears after reconnecting on another browser. Subfolders are not recursively imported.
- Latest first uses creation/upload timestamps. Existing backed-up media retains its catalog timestamp; new uploads use Drive creation time.
- Drive files stay private; Untracked same-name files in a target folder are reported for review rather than duplicated. Google previews require the viewer to be signed into an account with access. No public sharing permission is created.

## Session limits

Tokens live only in memory. Reconnect after a page reload or expired session; Google's existing consent is reused where possible. This is an active-tab uploader, not an unattended PC folder watcher. Closing the tab stops work. A persistent backend and securely stored refresh tokens would be required for unattended background synchronization.

## Verification

Run `npm ci --ignore-scripts`, `node --test tests/drive.test.js`, and `npm run build`. Automated tests mock Google responses; a real owner-authorized photo/video upload and refresh must still be checked after OAuth setup. Real Drive uploads and production deployment are not claimed by these tests.
