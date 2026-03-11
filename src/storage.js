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
