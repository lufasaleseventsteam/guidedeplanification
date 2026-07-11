const KEY = "lufa-events-v1";

export function loadEvents() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveEvents(events) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch(e) {
    // Quota exceeded — try without map image data as fallback cache
    try {
      localStorage.removeItem(KEY);
      const stripped = events.map(ev => ({
        ...ev,
        mapImages: (ev.mapImages || []).map(img => ({ ...img, data: undefined }))
      }));
      localStorage.setItem(KEY, JSON.stringify(stripped));
    } catch(e2) {
      // If still failing, skip localStorage — Supabase is the source of truth
      console.warn("localStorage unavailable, relying on Supabase only:", e2.message);
    }
  }
}
