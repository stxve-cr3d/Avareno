export async function onRequest(context) {
  const apiOrigin = normalizeApiOrigin(context.env.AVARENO_API_ORIGIN);
  if (!apiOrigin) {
    return Response.json(
      {
        error: "Avareno API is not deployed on Cloudflare yet.",
        nextStep: "Deploy the backend separately and set AVARENO_API_ORIGIN for the Pages project."
      },
      { status: 501 }
    );
  }

  const incomingUrl = new URL(context.request.url);
  const targetUrl = new URL(apiOrigin);
  const prefix = targetUrl.pathname.replace(/\/$/, "");
  targetUrl.pathname = `${prefix}${incomingUrl.pathname}`;
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  const init = {
    method: context.request.method,
    headers,
    redirect: "manual"
  };

  if (!["GET", "HEAD"].includes(context.request.method)) {
    init.body = context.request.body;
  }

  return fetch(targetUrl, init);
}

function normalizeApiOrigin(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return "";
  }

  if (url.protocol !== "https:") {
    return "";
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  ) {
    return "";
  }

  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
