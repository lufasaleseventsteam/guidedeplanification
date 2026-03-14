// Google Drive integration
// Saves generated PDFs/Docs to a shared folder, organized by month

const CLIENT_ID    = "501413490319-4pu387normemfmcna5bjc5vniaecce83.apps.googleusercontent.com";
const PARENT_FOLDER = "1Ttn32tDLv_OvbBvRmnXn7rWGsIm-rFLm";
const SCOPES       = "https://www.googleapis.com/auth/drive";

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

async function makePublicWritable(fileId) {
  const token = await getAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "writer", type: "anyone" }),
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


// ── Shared events database (Supabase) ────────────────────────────────────────
// All users read/write the same Supabase table — no ownership issues.
const SUPABASE_URL = "https://jrydofpleiwjyyeeohvq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyeWRvZnBsZWl3anl5ZWVvaHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjQyMDUsImV4cCI6MjA4OTA0MDIwNX0.lCDmSsIrREWfGH5F2Cg7KlfiW-q_XPckK8Xnzgpeo_o";

function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Prefer": "return=minimal"
  };
}

export async function loadEventsFromDrive() {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/events?select=id,data,updated_at&order=updated_at.desc`,
    { headers: supabaseHeaders() }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Supabase] Load failed: ${err}`);
  }
  const rows = await resp.json();
  return rows.map(r => r.data);
}

export async function saveEventsToDrive(events) {
  // Upsert each event individually by id
  const rows = events.map(ev => ({
    id: ev.id,
    data: ev,
    updated_at: new Date().toISOString()
  }));

  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/events`,
    {
      method: "POST",
      headers: { ...supabaseHeaders(), "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows)
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Supabase] Save failed: ${err}`);
  }
}

export async function deleteEventFromDb(eventId) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: supabaseHeaders() }
  );
}


// ── Get current month's Drive folder URL ────────────────────────────────────
export async function getMonthFolderUrl() {
  const folderId = await getOrCreateMonthFolder();
  return `https://drive.google.com/drive/folders/${folderId}`;
}
