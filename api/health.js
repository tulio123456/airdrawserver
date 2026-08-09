function allowedOrigin(request) {
  const origin = (request.headers.get("origin") || "").replace(/\/+$/, "");
  const allowed = String(process.env.ALLOWED_ORIGINS || "https://airdrawclient.vercel.app").split(",").map(x => x.trim().replace(/\/+$/, "")).filter(Boolean);
  if (!origin) return "*";
  if (allowed.includes(origin)) return origin;
  try {
    const current = new URL(origin);
    for (const item of allowed) {
      const base = new URL(item);
      if (!base.hostname.endsWith(".vercel.app")) continue;
      const slug = base.hostname.slice(0, -".vercel.app".length);
      if (current.protocol === "https:" && current.hostname.startsWith(`${slug}-`) && current.hostname.endsWith(".vercel.app")) return origin;
    }
  } catch {}
  return null;
}

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "OPTIONS") return Response.json({ error: "Método não permitido" }, { status: 405 });
    const origin = allowedOrigin(request);
    if (!origin) return Response.json({ error: "Origem não autorizada" }, { status: 403 });
    const headers = { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Cache-Control": "no-store" };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    return Response.json({
      ok: true,
      service: "AirDraw Server",
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
      originsConfigured: Boolean(process.env.ALLOWED_ORIGINS),
      recordings: true,
      captures: true,
      uploadTransport: "simple-cors",
      time: new Date().toISOString()
    }, { headers });
  }
};
