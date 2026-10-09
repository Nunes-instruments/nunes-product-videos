import React, { useState } from 'react';
import { DRIVE_ACCOUNT } from './drive';
export default function DrivePanel({ settings, onConnect, connected, busy, progress, error, onBackup, onRefresh, onDisconnect, onClose, onStop, results }) {
  const [form, setForm] = useState(settings);
  return <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <section className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" aria-label="Google Drive settings">
      <div className="flex items-center justify-between mb-4"><div><h2 className="text-xl font-bold text-slate-900">Google Drive backup</h2><p className="text-sm text-slate-500">{DRIVE_ACCOUNT}</p></div><button onClick={onClose} aria-label="Close Drive settings" className="p-2">✕</button></div>
      <div className={`rounded-xl p-3 text-sm mb-4 ${connected ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
        {connected ? 'Connected · New uploads save directly to Google Drive.' : 'Not connected · Connect the account before uploading.'}
      </div>
      <div className="space-y-3">
        {[["clientId", "Google Web OAuth client ID"], ["root", "Main Drive folder link or ID"], ["videos", "Existing Videos folder (optional)"], ["photos", "Existing Photos folder (optional)"]].map(([key,label]) => <label key={key} className="block text-xs font-semibold text-slate-600">{label}<input disabled={busy || connected} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="block w-full mt-1 rounded-xl border border-slate-300 p-3 text-sm" /></label>)}
        <p className="text-xs text-slate-500">If media folder links are blank, the app finds or creates “1 - Product Videos” and “2 - Product Photos” inside the main folder. Files remain private unless you change sharing in Drive.</p>
        <p className="text-xs text-slate-500">Google Drive permission lets this app access your existing folders. This feature reads the selected media folders and adds backups; it does not delete files.</p>
        <details className="text-xs text-slate-600 border rounded-xl p-3"><summary className="cursor-pointer font-semibold">One-time Google setup</summary><ol className="list-decimal ml-4 mt-2 space-y-2"><li>In Google Cloud, enable Google Drive API.</li><li>Create an OAuth client of type Web application. Add <strong>{window.location.origin}</strong> as an Authorized JavaScript origin.</li><li>Configure the consent screen. While testing, add {DRIVE_ACCOUNT} as a test user. Use your own Web OAuth client, not the Google Cloud SDK client.</li><li>Paste the public client ID above. No client secret or password is needed.</li></ol></details>
        <div className="flex flex-wrap gap-2 pt-2">
          {!connected ? <button disabled={busy} onClick={() => onConnect(form)} className="bg-blue-700 text-white px-4 py-2 rounded-xl disabled:opacity-50">Connect Drive</button> : <><button disabled={busy} onClick={onRefresh} className="bg-blue-700 text-white px-4 py-2 rounded-xl disabled:opacity-50">Refresh Drive media</button><button disabled={busy} onClick={onBackup} className="bg-emerald-700 text-white px-4 py-2 rounded-xl disabled:opacity-50">Back up existing media</button><button disabled={busy} onClick={onDisconnect} className="border px-4 py-2 rounded-xl disabled:opacity-50">Disconnect</button></>}
          {busy && <button onClick={onStop} className="border px-4 py-2 rounded-xl">Stop after current file</button>}
        </div>
        <p role="status" className="text-sm text-slate-700">{progress}</p>
        {error && <p role="alert" className="rounded-xl p-3 text-sm text-red-800 bg-red-50">{error}</p>}
        {results.length > 0 && <div className="border rounded-xl p-3 max-h-40 overflow-auto text-xs space-y-2">{results.map((r,i) => <p key={i} className={r.ok ? 'text-emerald-700' : 'text-red-700'}>{r.name}: {r.message}</p>)}</div>}
        <p className="text-xs text-slate-500">Keep this tab open during backup. Existing videos need the original PC stream server online. Google may ask you to reconnect after the session expires; tokens are never saved in browser storage.</p>
      </div>
    </section>
  </div>;
}
