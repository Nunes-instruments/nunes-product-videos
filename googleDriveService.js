import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_DIR = path.join(__dirname, 'credentials');
const TOKENS_FILE = path.join(CREDENTIALS_DIR, 'drive_tokens.json');
const OAUTH_CONFIG_FILE = path.join(CREDENTIALS_DIR, 'oauth_config.json');
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'service_account.json');

try {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  }
} catch (e) {
  // Ignored in read-only environments (e.g. Vercel serverless)
}

export const FOLDERS = {
  photos: '1uGjQkCgdCgiqsE-1Ri_aNC4-X2FSlA43',
  videos: '1-vhkY7WfIHVwRlFarYooSwooWwnBWf94'
};

export const FOLDER_URLS = {
  photos: 'https://drive.google.com/drive/folders/1uGjQkCgdCgiqsE-1Ri_aNC4-X2FSlA43',
  videos: 'https://drive.google.com/drive/folders/1-vhkY7WfIHVwRlFarYooSwooWwnBWf94'
};

// Default OAuth credentials fallback if not set in environment or file
const DEFAULT_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const DEFAULT_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export function getOAuthConfig() {
  let config = {
    clientId: DEFAULT_CLIENT_ID,
    clientSecret: DEFAULT_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5050/api/drive/callback'
  };

  if (fs.existsSync(OAUTH_CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(OAUTH_CONFIG_FILE, 'utf-8'));
      config = { ...config, ...data };
    } catch (e) {
      console.error('Error reading oauth_config.json:', e);
    }
  }
  return config;
}

export function saveOAuthConfig(newConfig) {
  const current = getOAuthConfig();
  const updated = { ...current, ...newConfig };
  fs.writeFileSync(OAUTH_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function getTokens() {
  if (fs.existsSync(TOKENS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error reading drive_tokens.json:', e);
    }
  }
  return null;
}

export function saveTokens(tokens) {
  const current = getTokens() || {};
  const updated = {
    ...current,
    ...tokens,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

// Generate OAuth 2.0 Auth URL with offline access and force consent to guarantee refresh_token
export function getAuthUrl(redirectUriOverride = null) {
  const config = getOAuthConfig();
  const redirectUri = redirectUriOverride || config.redirectUri;
  const scopes = 'https://www.googleapis.com/auth/drive';

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code, redirectUriOverride = null) {
  const config = getOAuthConfig();
  const redirectUri = redirectUriOverride || config.redirectUri;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
  }

  // Fetch account email using the access token
  let accountEmail = 'instruasia@gmail.com';
  try {
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    if (userinfoRes.ok) {
      const userInfo = await userinfoRes.json();
      accountEmail = userInfo.email || accountEmail;
    }
  } catch (e) {
    console.warn('Could not fetch user info:', e);
  }

  const tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || (getTokens()?.refreshToken),
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope,
    accountEmail
  };

  saveTokens(tokens);
  return tokens;
}

// Seamlessly refresh expired access token without user prompt
export async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens || !tokens.refreshToken) {
    throw new Error('NO_REFRESH_TOKEN: Google Drive has not been authorized yet.');
  }

  const config = getOAuthConfig();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: tokens.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token'
    })
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.error === 'invalid_grant') {
      saveTokens({ ...tokens, error: 'Reauthorization Required' });
    }
    throw new Error(`REFRESH_FAILED: ${data.error_description || data.error}`);
  }

  const updatedTokens = {
    ...tokens,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    error: null
  };

  saveTokens(updatedTokens);
  return updatedTokens.accessToken;
}

// Service Account JWT Access Token generator
export async function getServiceAccountAccessToken() {
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) return null;
  try {
    const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
    if (!sa.client_email || !sa.private_key) return null;
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claimSet = Buffer.from(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(header + '.' + claimSet);
    const signature = sign.sign(sa.private_key, 'base64url');
    const jwt = header + '.' + claimSet + '.' + signature;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    const data = await res.json();
    return data.access_token || null;
  } catch (e) {
    console.warn('Service Account token error:', e.message);
    return null;
  }
}

// Get valid access token (OAuth first, then Service Account fallback)
export async function getValidAccessToken() {
  const tokens = getTokens();
  if (tokens && tokens.refreshToken) {
    const fiveMinutes = 5 * 60 * 1000;
    if (!tokens.accessToken || (tokens.expiresAt && Date.now() >= tokens.expiresAt - fiveMinutes)) {
      try {
        return await refreshAccessToken();
      } catch (e) {
        console.error('Auto-refresh token error:', e.message);
      }
    } else {
      return tokens.accessToken;
    }
  }

  // Fallback to Service Account
  return await getServiceAccountAccessToken();
}

// Test Drive Connection to folders and return detailed status
export async function getDriveStatus() {
  const tokens = getTokens();
  let accessToken = null;
  let accountEmail = null;
  let authType = 'none';

  if (tokens && tokens.refreshToken) {
    accessToken = await getValidAccessToken();
    accountEmail = tokens.accountEmail || 'instruasia@gmail.com';
    authType = 'OAuth 2.0';
  }

  if (!accessToken) {
    // Try Service Account
    const saToken = await getServiceAccountAccessToken();
    if (saToken) {
      accessToken = saToken;
      try {
        const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
        accountEmail = sa.client_email;
        authType = 'Service Account';
      } catch (e) {
        accountEmail = 'nunes-drive-sync@nunes-mail-d072f3ce1.iam.gserviceaccount.com';
      }
    }
  }

  if (!accessToken) {
    return {
      connected: false,
      status: 'Disconnected',
      accountEmail: null,
      photosAccessible: false,
      videosAccessible: false,
      photosFolderId: FOLDERS.photos,
      videosFolderId: FOLDERS.videos,
      message: 'Google Drive is not connected. Click "Connect Google Drive Once" or share folders with the Service Account.'
    };
  }

  // Check accessibility of Photos and Videos folders
  let photosAccessible = false;
  let videosAccessible = false;

  try {
    const pRes = await fetch(`https://www.googleapis.com/drive/v3/files/${FOLDERS.photos}?fields=id,name`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    photosAccessible = pRes.ok;
  } catch (e) {}

  try {
    const vRes = await fetch(`https://www.googleapis.com/drive/v3/files/${FOLDERS.videos}?fields=id,name`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    videosAccessible = vRes.ok;
  } catch (e) {}

  const connected = photosAccessible || videosAccessible;

  return {
    connected,
    status: (photosAccessible && videosAccessible) ? 'Connected' : (connected ? 'Partially Connected' : 'Disconnected (Folder Permission Required)'),
    accountEmail,
    authType,
    photosAccessible,
    videosAccessible,
    photosFolderId: FOLDERS.photos,
    videosFolderId: FOLDERS.videos,
    serviceAccountEmail: 'nunes-drive-sync@nunes-mail-d072f3ce1.iam.gserviceaccount.com',
    lastSync: tokens?.lastSync || null,
    expiresAt: tokens?.expiresAt || null
  };
}

// Upload file directly to designated folder (Photos or Videos)
export async function uploadFileToDrive({ filePath, buffer, fileName, mimeType, folderType = 'photos' }) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive authorization required.');
  }

  const folderId = folderType === 'photos' ? FOLDERS.photos : FOLDERS.videos;
  let fileContent = buffer;
  if (!fileContent && filePath && fs.existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath);
  }

  if (!fileContent) {
    throw new Error('No file content provided for upload.');
  }

  const metadata = {
    name: fileName,
    parents: [folderId]
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;

  const metaBuffer = Buffer.from(delimiter + metaPart + delimiter + mediaHeader, 'utf-8');
  const closeBuffer = Buffer.from(closeDelimiter, 'utf-8');
  const multipartBody = Buffer.concat([metaBuffer, fileContent, closeBuffer]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink,webContentLink,thumbnailLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartBody.length)
    },
    body: multipartBody
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`DRIVE_UPLOAD_FAILED (${res.status}): ${data.error?.message || JSON.stringify(data)}`);
  }

  return {
    id: data.id,
    name: data.name,
    size: data.size,
    webViewLink: data.webViewLink,
    webContentLink: data.webContentLink,
    thumbnailLink: data.thumbnailLink,
    folderId,
    folderType
  };
}

// Initiate Resumable Upload session for large files (videos)
export async function initiateResumableUpload({ fileName, mimeType, fileSize, folderType = 'videos' }) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive authorization required.');
  }

  const folderId = folderType === 'videos' ? FOLDERS.videos : FOLDERS.photos;
  const metadata = {
    name: fileName,
    parents: [folderId]
  };

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType || 'video/mp4',
      'X-Upload-Content-Length': String(fileSize)
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`INIT_RESUMABLE_FAILED (${res.status}): ${errText}`);
  }

  const uploadUrl = res.headers.get('location');
  if (!uploadUrl) {
    throw new Error('No resumable upload URL returned by Google Drive');
  }

  return {
    uploadUrl,
    fileName,
    folderId,
    folderType
  };
}

// Synchronize Google Drive library with local database
export async function syncDriveFolders() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive authorization required.');
  }

  const listFiles = async (folderId) => {
    let allFiles = [];
    let pageToken = null;
    do {
      const q = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        throw new Error(`Failed to list files in folder ${folderId}: ${res.statusText}`);
      }
      const data = await res.json();
      allFiles = allFiles.concat(data.files || []);
      pageToken = data.nextPageToken;
    } while (pageToken);
    return allFiles;
  };

  const drivePhotos = await listFiles(FOLDERS.photos);
  const driveVideos = await listFiles(FOLDERS.videos);

  // Update last sync time
  saveTokens({ lastSync: new Date().toISOString() });

  return {
    photos: drivePhotos,
    videos: driveVideos,
    syncedAt: new Date().toISOString()
  };
}
