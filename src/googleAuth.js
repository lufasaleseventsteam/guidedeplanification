// Google Sign-In — replaces PIN lock
// Only allows @lufa.com accounts
// Persists session in localStorage

const CLIENT_ID  = "501413490319-4pu387normemfmcna5bjc5vniaecce83.apps.googleusercontent.com";
const STORAGE_KEY = "lufa-google-session";

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed: " + src));
    document.head.appendChild(s);
  });
}

// ── Persisted session ────────────────────────────────────────────────────────
export function getSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Check expiry
    if (session.expiry && Date.now() > session.expiry) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

export function saveSession(user) {
  const session = {
    name:    user.name,
    email:   user.email,
    picture: user.picture,
    expiry:  Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Sign in with Google ──────────────────────────────────────────────────────

export { CLIENT_ID };
