// Simple localStorage wrapper — data is per-browser.
// For true shared storage across users, swap this with a backend (Firebase, Supabase, etc.)
// For now, use localStorage + manual export/import if needed.

const KEY = "lufa-events-v1";

export function loadEvents() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveEvents(events) {
  localStorage.setItem(KEY, JSON.stringify(events));
}

export function exportData() {
  const data = localStorage.getItem(KEY) || "[]";
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lufa-events-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const events = JSON.parse(e.target.result);
        saveEvents(events);
        res(events);
      } catch { rej(new Error("Fichier invalide")); }
    };
    reader.onerror = rej;
    reader.readAsText(file);
  });
}
