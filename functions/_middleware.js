// Pre-launch site lock: HTTP Basic Auth in front of the whole domain.
// Password lives in the Pages secret SITE_PASSWORD. Remove this file at launch.
//
// /api/webhooks/* stays open - Stripe cannot answer a Basic Auth challenge,
// and webhook security is already handled by HMAC signature verification.

const OPEN_PATH_PREFIXES = ["/api/webhooks/"];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (OPEN_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return context.next();
  }

  const expected = (context.env.SITE_PASSWORD || "").trim();
  if (!expected) {
    // Lock is configured-on: refuse rather than silently serve the site
    // if the secret is missing.
    return new Response("Site lock is misconfigured (SITE_PASSWORD missing).", { status: 503 });
  }

  const header = context.request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (timingSafeEqual(password, expected)) {
        return context.next();
      }
    } catch {
      // fall through to challenge
    }
  }

  return new Response("Avareno ist noch nicht öffentlich.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Avareno Preview", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function timingSafeEqual(a, b) {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.length; i += 1) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}
