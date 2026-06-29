export function productQrUrl(itemId: string, origin = window.location.origin) {
  return `${origin}/app/items/${encodeURIComponent(itemId)}`;
}

export function parseAvarenoProductQr(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    const match = url.pathname.match(/^\/(?:app\/)?(?:items|dinge)\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
