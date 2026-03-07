// Google Drive integration
// Saves generated PDFs/Docs to a shared folder, organized by month

const CLIENT_ID    = "501413490319-4pu387normemfmcna5bjc5vniaecce83.apps.googleusercontent.com";
const PARENT_FOLDER = "1Ttn32tDLv_OvbBvRmnXn7rWGsIm-rFLm";
const SCOPES       = "https://www.googleapis.com/auth/drive.file";

const FR_MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];

// ── Load GIS + GAPI scripts ─────────────────────────────────────────────────
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function ensureGapi() {
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise((res, rej) => window.gapi.load("client", { callback: res, onerror: rej }));
  if (!window.gapi.client.drive) {
    await window.gapi.client.init({});
    await window.gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest");
  }
}

async function ensureGis() {
  await loadScript("https://accounts.google.com/gsi/client");
}

// ── Token management ─────────────────────────────────────────────────────────
let _tokenClient = null;
let _accessToken = null;
let _tokenExpiry = 0;

function isTokenValid() {
  return _accessToken && Date.now() < _tokenExpiry - 60000;
}

async function getAccessToken() {
  if (isTokenValid()) return _accessToken;

  await ensureGis();
  await ensureGapi();

  return new Promise((res, rej) => {
    if (!_tokenClient) {
      _tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) { rej(new Error(resp.error)); return; }
          _accessToken = resp.access_token;
          _tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
          window.gapi.client.setToken({ access_token: _accessToken });
          res(_accessToken);
        },
      });
    }
    _tokenClient.requestAccessToken({ prompt: isTokenValid() ? "" : "consent" });
  });
}

// ── Drive API helpers ────────────────────────────────────────────────────────
async function findFolder(name, parentId) {
  const token = await getAccessToken();
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await resp.json();
  return data.files?.[0] || null;
}

async function createFolder(name, parentId) {
  const token = await getAccessToken();
  const resp = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  return await resp.json();
}

async function getOrCreateMonthFolder() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = now.getMonth(); // 0-indexed
  const mm     = String(month + 1).padStart(2, "0");
  const name   = `${year}-${mm} — ${FR_MONTHS[month]} ${year}`;

  let folder = await findFolder(name, PARENT_FOLDER);
  if (!folder) folder = await createFolder(name, PARENT_FOLDER);
  return folder.id;
}

async function uploadFile(blob, fileName, mimeType, folderId) {
  const token = await getAccessToken();

  // Create multipart upload
  const metadata = { name: fileName, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob, fileName);

  const resp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || "Upload failed");
  }
  return await resp.json(); // { id, name, webViewLink }
}

async function makePublicReadable(fileId) {
  const token = await getAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

// ── Main export: save to Drive and return shareable link ────────────────────
export async function saveToDrive(blob, fileName, mimeType) {
  const folderId = await getOrCreateMonthFolder();
  const file     = await uploadFile(blob, fileName, mimeType, folderId);
  await makePublicReadable(file.id);
  return {
    fileId:   file.id,
    name:     file.name,
    viewLink: file.webViewLink,
    // Direct share link
    shareLink: `https://drive.google.com/file/d/${file.id}/view?usp=sharing`,
  };
}

export function signOut() {
  if (_tokenClient && _accessToken) {
    window.google.accounts.oauth2.revoke(_accessToken);
  }
  _accessToken = null;
  _tokenExpiry = 0;
}
