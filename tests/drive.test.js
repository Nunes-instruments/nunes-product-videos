import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectDrive, disconnectDrive, isDriveConnected, folderId, validateFolder, uploadMedia, listMedia, mergeMedia, newestFirst, DRIVE_SCOPE } from '../src/drive.js';
const clientId = '123-example.apps.googleusercontent.com';
const memory = new Map();
let handler, seen, identity, granted;
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
beforeEach(() => {
  disconnectDrive(); memory.clear(); seen = []; identity = 'instruasia@gmail.com'; granted = true;
  globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key,value) => memory.set(key,value), removeItem: key => memory.delete(key) };
  globalThis.window = { google: { accounts: { oauth2: {
    hasGrantedAllScopes: () => granted,
    initTokenClient: config => { assert.equal(config.scope, DRIVE_SCOPE); assert.equal(config.include_granted_scopes, false); return { requestAccessToken: () => config.callback({ access_token: 'test-token', expires_in: 3600 }) }; }
  } } } };
  globalThis.fetch = async (url, options = {}) => {
    seen.push([url, options]);
    if (url.includes('/about?')) return json({ user: { emailAddress: identity } });
    return handler(url, options);
  };
});
test('wrong account is rejected before any folder or upload access', async () => {
  identity = 'different@example.com';
  await assert.rejects(connectDrive(clientId), /Please select instruasia/);
  assert.equal(isDriveConnected(), false); assert.equal(seen.length, 1);
});
test('partial consent never enables uploads', async () => {
  granted = false; await assert.rejects(connectDrive(clientId), /permission was not granted/);
  assert.equal(seen.length, 0);
});
test('folder parsing and permissions reject invalid destinations', async () => {
  assert.equal(folderId('https://drive.google.com/drive/u/0/folders/abc-123'), 'abc-123');
  assert.throws(() => folderId("bad'id"));
  await connectDrive(clientId);
  handler = () => json({ mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: false } });
  await assert.rejects(validateFolder('readonly'), /not writable/);
});
test('uploads multiple chunks then verifies remote size and parent', async () => {
  await connectDrive(clientId);
  const file = new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'sample.mp4', { type: 'video/mp4' });
  const remote = { id: 'saved-id', name: 'Product.mp4', size: String(file.size), parents: ['videos'], appProperties: { nunesKey: 'unique' }, createdTime: '2026-10-09T00:00:00Z' };
  let puts = 0; const progress = [];
  handler = (url, options) => {
    if (url.startsWith('https://www.googleapis.com/drive/v3/files?')) return json({ files: [] });
    if (url.includes('generateIds')) return json({ ids: ['saved-id'] });
    if (url.includes('uploadType=resumable')) { assert.deepEqual(JSON.parse(options.body).parents, ['videos']); return new Response(null, { status: 200, headers: { Location: 'https://www.googleapis.com/upload/session' } }); }
    if (url.endsWith('/upload/session')) { puts++; return new Response(null, { status: puts === 1 ? 308 : 200 }); }
    if (url.includes('/files/saved-id')) return json(remote);
    throw new Error(url);
  };
  const item = await uploadMedia(file, 'Product', 'unique', 'videos', 'videos', value => progress.push(value));
  assert.equal(item.driveFileId, 'saved-id'); assert.equal(puts, 2); assert.equal(progress.at(-1), 100);
  assert.equal(memory.size, 0);
  assert.ok(seen.slice(1).every(([,options]) => options.headers.Authorization === 'Bearer test-token'));
});
test('HTML fallback is never uploaded as a video', async () => {
  await connectDrive(clientId);
  await assert.rejects(uploadMedia(new File(['<html/>'], 'x.mp4', { type: 'text/html' }), 'Product', 'id', 'videos', 'parent'), /not a valid media/);
  assert.equal(seen.length, 1);
});
test('existing verified identity is reused without creating another file', async () => {
  await connectDrive(clientId);
  handler = () => json({ files: [{ id: 'existing', name: 'a.jpg', size: '3' }] });
  const item = await uploadMedia(new File(['abc'], 'a.jpg', { type: 'image/jpeg' }), 'a', 'same', 'photos', 'parent');
  assert.equal(item.driveFileId, 'existing'); assert.equal(seen.length, 2);
});
test('ambiguous previous upload completion reuses preallocated ID', async () => {
  await connectDrive(clientId); memory.set('nunes_pending_parent_same', 'previous');
  handler = url => url.includes('/files?') ? json({ files: [] }) : json({ id: 'previous', name: 'a.jpg', size: '3', parents: ['parent'] });
  const item = await uploadMedia(new File(['abc'], 'a.jpg', { type: 'image/jpeg' }), 'a', 'same', 'photos', 'parent');
  assert.equal(item.driveFileId, 'previous'); assert.ok(!seen.some(([,options]) => options.method === 'POST'));
});
test('verification mismatch is reported, not successful', async () => {
  await connectDrive(clientId);
  handler = url => {
    if (url.startsWith('https://www.googleapis.com/drive/v3/files?')) return json({ files: [] });
    if (url.includes('generateIds')) return json({ ids: ['bad-size'] });
    if (url.includes('uploadType=')) return new Response(null, { headers: { Location: 'https://www.googleapis.com/upload/session' } });
    if (url.endsWith('/session')) return new Response(null);
    return json({ id: 'bad-size', size: '1', parents: ['parent'] });
  };
  await assert.rejects(uploadMedia(new File(['abc'], 'a.jpg', { type: 'image/jpeg' }), 'a', 'same', 'photos', 'parent'), /could not be verified/);
  assert.equal(memory.get('nunes_pending_parent_same'), 'bad-size');
});
test('expired or revoked access disconnects and does not continue uploading', async () => {
  await connectDrive(clientId);
  handler = () => json({ error: { message: 'Expired token' } }, 401);
  await assert.rejects(listMedia({ videos: 'v', photos: 'p' }), /Expired token|session expired/);
  assert.equal(isDriveConnected(), false);
});
test('folder lists paginate and preserve the original catalog metadata when merged', async () => {
  await connectDrive(clientId);
  handler = url => { const p = new URL(url).searchParams; const photo = p.get('q').includes('image/'); return json({ files: [{ id: photo ? 'photo' : p.has('pageToken') ? 'second' : 'first', name: 'Product', appProperties: { nunesKey: photo ? 'photo_1' : p.has('pageToken') ? 'vid_2' : 'vid_1' } }], ...(!photo && !p.has('pageToken') ? { nextPageToken: 'next' } : {}) }); };
  const result = await listMedia({ videos: 'v', photos: 'p' });
  assert.equal(result.videos.length, 2);
  const merged = mergeMedia([{ id: 'vid_1', category: 'Testing', thumbnailUrl: '/real.jpg' }], result.videos);
  assert.equal(merged.length, 2); assert.equal(merged[0].thumbnailUrl, '/real.jpg'); assert.equal(merged[0].driveFileId, 'first');
  assert.deepEqual([{ createdAt: 'bad' }, { createdAt: '2026-10-09' }, { createdAt: '2026-01-01' }].sort(newestFirst).map(x => x.createdAt), ['2026-10-09', '2026-01-01', 'bad']);
});
test('same-name preexisting untracked file requires review instead of duplication', async () => {
  await connectDrive(clientId);
  handler = url => json({ files: new URL(url).searchParams.get('q').includes('name =') ? [{ id: 'manual', name: 'a.jpg', size: '3' }] : [] });
  await assert.rejects(uploadMedia(new File(['abc'], 'a.jpg', { type: 'image/jpeg' }), 'a', 'key', 'photos', 'parent'), /already exists/);
  assert.ok(!seen.some(([,options]) => options.method === 'POST'));
});
