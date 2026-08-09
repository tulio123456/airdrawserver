import { deleteObjects, getObjectBytes, listObjects, putObject, r2Configured } from "../lib/r2.js";

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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForParts(prefix, expected) {
  let latest = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await listObjects(prefix, 200);
    latest = result.objects.sort((a, b) => a.pathname.localeCompare(b.pathname));
    if (latest.length >= expected) return latest.slice(0, expected);
    await sleep(Math.min(650, 180 + attempt * 55));
  }
  return latest;
}

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
      const lastSeq = Math.max(0, Math.min(9999, Number(url.searchParams.get("lastSeq") || 0) | 0));
      const expected = lastSeq + 1;
      const mime = normalizeMime(url.searchParams.get("mime"));
      const ext = mime === "video/mp4" ? "mp4" : "webm";
      const prefix = `recording-parts/${recording}/`;

      const parts = await waitForParts(prefix, expected);
      if (parts.length < expected) {
        return Response.json({ error: `Gravação incompleta: ${parts.length}/${expected} blocos recebidos.` }, { status: 409, headers: cors(origin) });
      }

      const buffers = [];
      let total = 0;
      for (const part of parts) {
        const bytes = await getObjectBytes(part.pathname);
        total += bytes.byteLength;
        if (total > 12_000_000) throw new Error("Gravação excedeu o limite interno de montagem.");
        buffers.push(bytes);
      }

      const merged = new Uint8Array(total);
      let offset = 0;
      for (const bytes of buffers) { merged.set(bytes, offset); offset += bytes.byteLength; }

      const now = Date.now();
      const inverse = String(9_999_999_999_999 - now).padStart(13, "0");
      const pathname = `recordings/${inverse}-${now}-${recording}-${session}.${ext}`;
      await putObject(pathname, merged, mime, { session, recording });
      try { await deleteObjects(parts.map(part => part.pathname)); } catch (cleanupError) { console.warn("R2 recording parts cleanup", cleanupError); }

      return Response.json({ ok: true, pathname, size: total, storage: "cloudflare-r2" }, { status: 201, headers: cors(origin) });
    } catch (error) {
      console.error("recording finalize r2 error", error);
      return Response.json({ error: "Falha ao montar a gravação final no R2." }, { status: 500, headers: cors(origin) });
    }
  }
};
