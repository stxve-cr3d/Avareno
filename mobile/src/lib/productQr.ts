/** Ported from frontend/src/lib/productQr.ts. The web version trusts
    window.location.origin; the app instead accepts known Avareno hosts, since
    scanned QR codes always carry absolute URLs printed by the web app. */

const isAvarenoHost = (hostname: string) =>
  hostname === 'avareno.app'
  || hostname.endsWith('.avareno.app')
  || hostname === 'avareno.de'
  || hostname.endsWith('.avareno.de')
  || hostname.endsWith('.pages.dev')
  || hostname === 'localhost'
  || hostname === '127.0.0.1';

/** Item id from an Avareno product QR, or null when the code is foreign. */
export function parseAvarenoProductQr(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (!isAvarenoHost(url.hostname)) return null;

    const match = url.pathname.match(/^\/(?:app\/)?(?:items|dinge)\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
