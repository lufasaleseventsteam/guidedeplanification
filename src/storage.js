const KEY = "lufa-events-v1";

export function loadEvents() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveEvents(events) {
  try {
    // Strip map images before saving locally — they are large base64 strings
    // that quickly exceed localStorage quota. Images are re-uploaded to Drive on save.
    const stripped = events.map(ev => ({
      ...ev,
      mapImages: (ev.mapImages || []).map(img => ({
        ...img,
        data: undefined  // remove base64 data, keep metadata
      }))
    }));
    localStorage.setItem(KEY, JSON.stringify(stripped));
  } catch(e) {
    // Quota exceeded — clear and try again with stripped data
    try {
      localStorage.removeItem(KEY);
      const minimal = events.map(ev => ({ ...ev, mapImages: [] }));
      localStorage.setItem(KEY, JSON.stringify(minimal));
    } catch(e2) {
      // If still failing, just skip localStorage — Supabase is the source of truth
      console.warn("localStorage unavailable, relying on Supabase only:", e2.message);
    }
  }
}
