// Bridges the Pickled mobile app → this tourney page.
// Reads a shared match payload (auto from URL or via QR scan) and dispatches
// a `pickled:score-received` event that app.js updates the DB with.

const IMPORTS_KEY = 'pickled.imports';

function base64ToJson(b64) {
  try {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const json = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    console.warn('[pickled] decode failed', e);
    return null;
  }
}

function readAll() {
  try { return JSON.parse(localStorage.getItem(IMPORTS_KEY) || '{}'); }
  catch { return {}; }
}

function writeAll(obj) {
  localStorage.setItem(IMPORTS_KEY, JSON.stringify(obj));
}

// Deliver the payload to consumers. If it's linked to a scheduled match
// (has `eid`), dispatch a score-received event so app.js updates the DB.
// Otherwise store it locally for a "recent shared matches" panel.
function deliver(compact) {
  if (!compact || !compact.id) return null;

  if (compact.eid) {
    window.dispatchEvent(new CustomEvent('pickled:score-received', {
      detail: {
        tourneyMatchId: String(compact.eid).trim(),
        scoreA: compact.sa,
        scoreB: compact.sb,
        teamA: compact.a,
        teamB: compact.b,
        completedAt: compact.cd,
        durationMs: (compact.cd || Date.now()) - compact.ca - (compact.tp || 0),
        raw: compact,
      },
    }));
    return compact;
  }

  const all = readAll();
  all[compact.id] = compact;
  writeAll(all);
  window.dispatchEvent(new CustomEvent('pickled:match-imported', { detail: compact }));
  return compact;
}

// Extract a base64 payload from either a raw base64 string or a URL with ?pickled=…
function extractPayload(raw) {
  if (!raw) return null;
  let b64 = raw;
  try {
    const u = new URL(raw);
    const q = u.searchParams.get('pickled');
    if (q) b64 = q;
  } catch {
    // not a URL — assume raw base64
  }
  try { b64 = decodeURIComponent(b64); } catch {}
  return base64ToJson(b64);
}

// Auto-import from ?pickled=<b64> if the tab was opened from a share URL.
export function initAutoImport() {
  const params = new URLSearchParams(location.search);
  const p = params.get('pickled');
  if (!p) return;
  const compact = extractPayload(location.href);
  if (compact) deliver(compact);
  // Clean the URL so refresh doesn't re-import.
  const url = new URL(location.href);
  url.searchParams.delete('pickled');
  history.replaceState({}, '', url.toString());
}

// Open the camera in the given element and scan for a Pickled QR.
// Requires the html5-qrcode library to already be loaded (see index.html).
export async function scanPickledMatch(mountElId, opts = {}) {
  const mount = document.getElementById(mountElId);
  if (!mount) { console.error('[pickled] mount element not found:', mountElId); return null; }
  if (typeof Html5Qrcode !== 'function') {
    console.error('[pickled] html5-qrcode library is not loaded yet.');
    return null;
  }
  const scanner = new Html5Qrcode(mountElId);
  return new Promise((resolve, reject) => {
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: opts.qrbox || 250 },
      (decoded) => {
        const compact = extractPayload(decoded);
        if (!compact) return;
        scanner.stop().catch(() => {}).finally(() => {
          mount.innerHTML = '';
          const delivered = deliver(compact);
          resolve(delivered);
        });
      },
      () => {} // silent per-frame errors
    ).catch(reject);
  });
}

export function stopScan(mountElId) {
  const mount = document.getElementById(mountElId);
  if (!mount) return;
  try {
    const scanner = new Html5Qrcode(mountElId);
    scanner.stop().catch(() => {});
  } catch {}
  mount.innerHTML = '';
}

// Local (unlinked) shared matches — useful if you want a "recent shared" panel.
export const pickledImports = {
  all: () => Object.values(readAll()),
  byId: (id) => readAll()[id] || null,
  clear: () => localStorage.removeItem(IMPORTS_KEY),
};
