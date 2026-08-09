import { putObject, r2Configured } from "../lib/r2.js";

function allowedOrigin(request) {
  const origin = (request.headers.get("origin") || "").replace(/\/+$/, "");
  if (!origin) return null;
  const allowed = String(process.env.ALLOWED_ORIGINS || "https://airdrawclient.vercel.app").split(",").map(x => x.trim().replace(/\/+$/, "")).filter(Boolean);
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
function clean(value, fallback = "x") { const out = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120); return out || fallback; }
function normalizeMime(value) { return String(value || "").toLowerCase().includes("mp4") ? "video/mp4" : "video/webm"; }

export default {
  async fetch(request) {
    const origin = allowedOrigin(request);
    if (request.method === "OPTIONS") {
      if (!origin) return Response.json({ error: "Origem não autorizada" }, { status: 403 });
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== "POST") return Response.json({ error: "Método não permitido" }, { status: 405 });
    if (!origin) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
    if (!r2Configured()) return Response.json({ error: "Cloudflare R2 não configurado." }, { status: 500, headers: cors(origin) });

    try {
      const url = new URL(request.url);
      const session = clean(url.searchParams.get("session"), "sem_sessao");
      const recording = clean(url.searchParams.get("recording"), "gravacao");
      const seq = Math.max(0, Math.min(9999, Number(url.searchParams.get("seq") || 0) | 0));
      const mime = normalizeMime(url.searchParams.get("mime"));
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 2_000_000) {
        return Response.json({ error: "Bloco vazio ou maior que 2 MB." }, { status: 413, headers: cors(origin) });
      }
      const pathname = `recording-parts/${recording}/${String(seq).padStart(5, "0")}-${session}.part`;
      await putObject(pathname, new Uint8Array(bytes), "application/octet-stream", { session, recording, seq: String(seq), mime });
      return Response.json({ ok: true, pathname, seq, mime, storage: "cloudflare-r2" }, { status: 201, headers: cors(origin) });
    } catch (error) {
      console.error("recording chunk r2 error", error);
      return Response.json({ error: "Falha ao salvar bloco da gravação no R2." }, { status: 500, headers: cors(origin) });
    }
  }
};
