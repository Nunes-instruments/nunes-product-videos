export const DRIVE_ACCOUNT = 'instruasia@gmail.com';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const API = 'https://www.googleapis.com/drive/v3';
let token = '', expires = 0;
let sdkPromise;
export const isDriveConnected = () => Boolean(token && Date.now() < expires);
export function disconnectDrive() { token = ''; expires = 0; }
export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = () => { sdkPromise = null; script.remove(); reject(new Error('Google sign-in could not load. Check your connection.')); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
export function connectDrive(clientId) {
  if (!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('Enter the Google Web OAuth client ID in Drive settings.');
  if (!window.google?.accounts?.oauth2) throw new Error('Google sign-in is loading. Please try Connect again.');
  disconnectDrive();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: DRIVE_SCOPE, include_granted_scopes: false,
      hint: DRIVE_ACCOUNT,
      error_callback: () => reject(new Error('Google sign-in was closed or blocked. Please try again.')),
      callback: async response => {
        try {
          if (response.error || !response.access_token) throw new Error(response.error_description || response.error || 'Google did not grant access.');
          if (!window.google.accounts.oauth2.hasGrantedAllScopes(response, DRIVE_SCOPE)) throw new Error('Drive permission was not granted.');
          token = response.access_token; expires = Date.now() + Number(response.expires_in) * 1000 - 60000;
          const about = await request('/about?fields=user(emailAddress)');
          if (about.user?.emailAddress?.toLowerCase() !== DRIVE_ACCOUNT) throw new Error(`Please select ${DRIVE_ACCOUNT}. No files were uploaded.`);
          resolve(about.user.emailAddress);
        } catch (error) { disconnectDrive(); reject(error); }
      }
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}
async function authorizedFetch(url, options = {}) {
  if (!isDriveConnected()) throw new Error('Google Drive session expired. Click Connect Drive, then retry.');
  const response = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  if (!response.ok && response.status !== 308) {
    if (response.status === 401) disconnectDrive();
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error?.message || `Drive request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response;
}
async function request(path, options) {
  return (await authorizedFetch(API + path, options)).json();
}
const quote = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
export function folderId(value) {
  const id = value.trim().match(/\/folders\/([\w-]+)/)?.[1] || value.trim();
  if (!/^[\w-]+$/.test(id)) throw new Error('Enter a valid Drive folder link or ID.');
  return id;
}
async function list(q) {
  const files = []; let pageToken;
  do {
    const params = new URLSearchParams({ q: `trashed = false and (${q})`, fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,webViewLink,thumbnailLink,appProperties,parents)', pageSize: '1000', orderBy: 'createdTime desc' });
    if (pageToken) params.set('pageToken', pageToken);
    const result = await request('/files?' + params);
    files.push(...(result.files || [])); pageToken = result.nextPageToken;
  } while (pageToken);
  return files;
}
export async function validateFolder(value) {
  const id = folderId(value);
  const folder = await request(`/files/${encodeURIComponent(id)}?fields=id,mimeType,trashed,capabilities(canAddChildren)`);
  if (folder.trashed || folder.mimeType !== 'application/vnd.google-apps.folder' || !folder.capabilities?.canAddChildren) throw new Error('The selected folder is unavailable or not writable.');
  return id;
}
export async function prepareFolders(settings) {
  const root = await validateFolder(settings.root);
  const result = {};
  for (const kind of ['videos', 'photos']) {
    if (settings[kind]) result[kind] = await validateFolder(settings[kind]);
    else {
      const name = kind === 'videos' ? '1 - Product Videos' : '2 - Product Photos';
      const found = await list(`'${quote(root)}' in parents and name = '${quote(name)}' and mimeType = 'application/vnd.google-apps.folder'`);
      if (found.length > 1) throw new Error(`Multiple folders named ${name}. Enter the exact folder link in settings.`);
      result[kind] = found[0]?.id || (await request('/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [root] }) })).id;
      await validateFolder(result[kind]);
    }
  }
  if (result.videos === result.photos) throw new Error('Choose separate Photos and Videos folders.');
  return result;
}
export async function listMedia(folders) {
  const groups = await Promise.all(['videos', 'photos'].map(async kind => {
    const files = await list(`'${quote(folders[kind])}' in parents and mimeType contains '${kind === 'photos' ? 'image/' : 'video/'}'`);
    return files.map(file => toItem(file, kind));
  }));
  return { videos: groups[0], photos: groups[1] };
}
function toItem(file, kind) {
  return { id: file.appProperties?.nunesKey || `drive_${file.id}`, driveFileId: file.id, driveUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`, productName: file.name.replace(/\.[^.]+$/, ''), originalFilename: file.name, currentFilename: file.name, createdAt: file.createdTime, sizeMb: +(Number(file.size || 0) / 1048576).toFixed(2), category: 'Product Media', isRenamed: true, ...(kind === 'photos' ? { imageUrl: file.thumbnailLink || '' } : { thumbnailUrl: file.thumbnailLink || '' }) };
}
export function mergeMedia(existing, incoming) {
  const output = [...existing];
  for (const item of incoming) {
    const index = output.findIndex(old => old.id === item.id || (old.driveFileId && old.driveFileId === item.driveFileId));
    if (index < 0) output.push(item);
    else output[index] = output[index].filePath || output[index].thumbnailUrl?.startsWith('/')
      ? { ...item, ...output[index], driveFileId: item.driveFileId, driveUrl: item.driveUrl }
      : { ...output[index], ...item };
  }
  return output;
}
export const newestFirst = (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
export async function uploadMedia(file, name, key, kind, parent, onProgress = () => {}) {
  if (!file.size || !file.type.startsWith(kind === 'photos' ? 'image/' : 'video/')) throw new Error('The source is not a valid media file. The original file may be offline.');
  const prior = await list(`'${quote(parent)}' in parents and appProperties has { key='nunesKey' and value='${quote(key)}' }`);
  if (prior.length) {
    if (Number(prior[0].size) !== file.size) throw new Error('A backup with this identity has a different size. Review the existing Drive file before retrying.');
    return toItem(prior[0], kind);
  }
  const extension = (file.name || '').match(/\.[a-zA-Z0-9]+$/)?.[0] || (kind === 'photos' ? '.jpg' : '.mp4');
  const filename = name.toLowerCase().endsWith(extension.toLowerCase()) ? name : name + extension;
  const sameName = await list(`'${quote(parent)}' in parents and name = '${quote(filename)}'`);
  if (sameName.some(candidate => candidate.appProperties?.nunesKey !== key)) throw new Error('A file with this name already exists in the destination. Review it in Drive before adding another copy.');
  // Reuse a pre-generated ID across retries, including an ambiguous network failure after commit.
  const pendingKey = `nunes_pending_${parent}_${key}`;
  let id = localStorage.getItem(pendingKey);
  if (id) {
    try { const existing = await request(`/files/${id}?fields=id,name,size,createdTime,webViewLink,appProperties,mimeType,parents`); if (existing.parents?.includes(parent) && Number(existing.size) === file.size) return toItem(existing, kind);
      throw new Error('Existing upload could not be verified. Review the Drive file before retrying.'); }
    catch (error) { if (error.status !== 404) throw error; }
  } else {
    id = (await request('/files/generateIds?count=1&space=drive&type=files')).ids[0];
    localStorage.setItem(pendingKey, id);
  }
  const session = await authorizedFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': file.type, 'X-Upload-Content-Length': String(file.size) }, body: JSON.stringify({ id, name: filename, parents: [parent], appProperties: { nunesKey: key } }) });
  const location = session.headers.get('Location');
  if (!location || new URL(location).origin !== 'https://www.googleapis.com') throw new Error('Drive did not return a valid upload session.');
  const chunkSize = 8 * 1024 * 1024;
  for (let start = 0; start < file.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, file.size);
    await authorizedFetch(location, { method: 'PUT', headers: { 'Content-Type': file.type, 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` }, body: file.slice(start, end) });
    onProgress(Math.round(end / file.size * 100));
  }
  const saved = await request(`/files/${id}?fields=id,name,size,createdTime,webViewLink,appProperties,mimeType,parents`);
  if (Number(saved.size) !== file.size || !saved.parents?.includes(parent)) throw new Error('Drive upload could not be verified. Retry to check its status.');
  localStorage.removeItem(pendingKey);
  return toItem(saved, kind);
}
export async function renameDriveMedia(item, title) {
  const extension = item.currentFilename?.match(/\.[a-zA-Z0-9]+$/)?.[0] || '';
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Enter a product name.');
  const name = extension && !trimmed.toLowerCase().endsWith(extension.toLowerCase()) ? trimmed + extension : trimmed;
  const saved = await request(`/files/${encodeURIComponent(item.driveFileId)}?fields=name`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  return { ...item, currentFilename: saved.name, productName: trimmed, isRenamed: true };
}
