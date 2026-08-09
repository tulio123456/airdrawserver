import { deleteObjects, listObjects, putObject, r2Configured } from "../lib/r2.js";

function allowedOrigin(request) {
  const origin = (request.headers.get("origin") || "").replace(/\/+$/, "");
  if (!origin) return null;
  const allowed = String(process.env.ALLOWED_ORIGINS || "https://airdrawclient.vercel.app")
    .split(",").map(x => x.trim().replace(/\/+$/, "")).filter(Boolean);
  if (allowed.includes(origin)) return origin;
  try {
    const current = new URL(origin);
    if (current.protocol !== "https:") return null;
    for (const item of allowed) {
      const base = new URL(item);
      if (!base.hostname.endsWith(".vercel.app")) continue;
      const slug = base.hostname.slice(0, -".vercel.app".length);
      if (current.hostname === `${slug}.vercel.app` || (current.hostname.startsWith(`${slug}-`) && current.hostname.endsWith(".vercel.app"))) return origin;
    }
  } catch {}
  return null;
}
function cors(origin) { return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", "Vary": "Origin" }; }
function clean(value) { return String(value || "sem_sessao").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90); }
function extensionFor(type) { return type.includes("mp4") ? "mp4" : "webm"; }

export default {
  async fetch(request) {
    const origin = allowedOrigin(request);
    if (request.method === "OPTIONS") {
      if (!origin) return Response.json({ error: "Origem não autorizada" }, { status: 403 });
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== "POST") return Response.json({ error: "Método não permitido" }, { status: 405 });
    if (!origin) return Response.json({ error: "Origem não autorizada. Confira ALLOWED_ORIGINS." }, { status: 403 });
    if (!r2Configured()) return Response.json({ error: "Cloudflare R2 não configurado no servidor." }, { status: 500, headers: cors(origin) });

    const url = new URL(request.url);
    const transportType = (request.headers.get("content-type") || "").toLowerCase();
    const declaredMime = (url.searchParams.get("mime") || "").toLowerCase();
    const type = declaredMime.includes("mp4") ? "video/mp4" : declaredMime.includes("webm") ? "video/webm" : transportType;
    const accepted = transportType.startsWith("video/webm") || transportType.startsWith("video/mp4") || transportType.startsWith("text/plain") || transportType.startsWith("application/octet-stream");
    if (!accepted || (!type.startsWith("video/webm") && !type.startsWith("video/mp4"))) {
      return Response.json({ error: "Envie video/webm ou video/mp4." }, { status: 415, headers: cors(origin) });
    }

    try {
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 4_200_000) {
        return Response.json({ error: "Vídeo vazio ou maior que 4,2 MB." }, { status: 413, headers: cors(origin) });
      }
      const session = clean(url.searchParams.get("session"));
      const recording = clean(url.searchParams.get("recording") || `direct-${Date.now()}`);
      const now = Date.now();
      const inverse = String(9_999_999_999_999 - now).padStart(13, "0");
      const ext = extensionFor(type);
      const contentType = ext === "mp4" ? "video/mp4" : "video/webm";
      const pathname = `recordings/${inverse}-${now}-${recording}-${session}.${ext}`;
      await putObject(pathname, new Uint8Array(bytes), contentType, { session, recording });

      try {
        const parts = await listObjects(`recording-parts/${recording}/`, 200);
        if (parts.objects.length) await deleteObjects(parts.objects.map(item => item.pathname));
      } catch (cleanupError) { console.warn("R2 recording parts cleanup", cleanupError); }

      return Response.json({ ok: true, pathname, storage: "cloudflare-r2" }, { status: 201, headers: cors(origin) });
    } catch (error) {
      console.error("recording r2 error", error);
      return Response.json({ error: "Falha ao salvar gravação no Cloudflare R2." }, { status: 500, headers: cors(origin) });
    }
  }
};
