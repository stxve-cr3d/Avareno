export async function onRequest() {
  return Response.json(
    {
      error: "Avareno API is not deployed on Cloudflare yet.",
      nextStep: "Deploy the backend separately and set VITE_API_ORIGIN, or migrate the API to Cloudflare Workers/D1/R2."
    },
    { status: 501 }
  );
}
