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
    _tokenClient.requestAccessToken({ prompt: "" }); // never force consent screen
  });
}

// ── Drive API helpers ────────────────────────────────────────────────────────
async function findFolders(name, parentId) {
  const token = await getAccessToken();
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime)&orderBy=createdTime&includeItemsFromAllDrives=true&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await resp.json();
  return data.files || [];
}

async function createFolder(name, parentId) {
  const token = await getAccessToken();
  const resp = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
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
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const mm    = String(month + 1).padStart(2, "0");
  const name  = `${year}-${mm} — ${FR_MONTHS[month]} ${year}`;

  // First check: any existing folders?
  let folders = await findFolders(name, PARENT_FOLDER);
  if (folders.length === 0) {
    // None found — try to create one (another user might do the same simultaneously)
    try { await createFolder(name, PARENT_FOLDER); } catch(e) {}
    // Wait briefly then re-query — both users will now see both folders
    await new Promise(r => setTimeout(r, 800));
    folders = await findFolders(name, PARENT_FOLDER);
  }
  // Always use the oldest folder (createdTime ascending = first in list)
  // This ensures all users converge on the same folder even if duplicates exist
  return folders[0].id;
}

async function uploadFile(blob, fileName, mimeType, folderId, convertToGoogleDoc = false) {
  const token = await getAccessToken();

  const docName = convertToGoogleDoc ? fileName.replace(/\.docx$/i, "") : fileName;
  const metadata = {
    name: docName,
    parents: [folderId],
    ...(convertToGoogleDoc ? { mimeType: "application/vnd.google-apps.document" } : {}),
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob, fileName);

  const resp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || "Upload failed");
  }
  return await resp.json();
}

async function makePublicReadable(fileId) {
  const token = await getAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

// ── Delete a file from Drive ──────────────────────────────────────────────────
export async function deleteDriveFile(fileId) {
  try {
    const token = await getAccessToken();
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch(e) {
    console.error("deleteDriveFile failed:", e);
  }
}

// ── Main export: save to Drive and return shareable link ────────────────────
export async function saveToDrive(blob, fileName, mimeType) {
  const folderId = await getOrCreateMonthFolder();
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const file   = await uploadFile(blob, fileName, mimeType, folderId, isDocx);
  await makePublicReadable(file.id);
  return {
    fileId:    file.id,
    name:      file.name,
    viewLink:  file.webViewLink,
    shareLink: `https://drive.google.com/file/d/${file.id}/view?usp=sharing`,
  };
}


// ── Shared events database ───────────────────────────────────────────────────
const DB_FILE_NAME = "events-db.json";

async function findDbFile() {
  const token = await getAccessToken();
  const q = `name='${DB_FILE_NAME}' and '${PARENT_FOLDER}' in parents and trashed=false`;
  // includeItemsFromAllDrives ensures we see files created by other users
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await resp.json();
  return data.files?.[0] || null;
}

export async function loadEventsFromDrive() {
  try {
    const token = await getAccessToken();
    const file = await findDbFile();
    if (!file) return []; // no DB yet — fresh start
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("loadEventsFromDrive error:", e);
    return [];
  }
}

export async function saveEventsToDrive(events) {
  const token = await getAccessToken();
  const blob = new Blob([JSON.stringify(events)], { type: "application/json" });
  const existing = await findDbFile();

  if (existing) {
    // Update existing file
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name: DB_FILE_NAME })], { type: "application/json" }));
    form.append("file", blob, DB_FILE_NAME);
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&supportsAllDrives=true`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: form }
    );
  } else {
    // Create new file
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name: DB_FILE_NAME, parents: [PARENT_FOLDER] })], { type: "application/json" }));
    form.append("file", blob, DB_FILE_NAME);
    await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
    );
  }
}

// ── Get current month's Drive folder URL ────────────────────────────────────
export async function getMonthFolderUrl() {
  const folderId = await getOrCreateMonthFolder();
  return `https://drive.google.com/drive/folders/${folderId}`;
}
