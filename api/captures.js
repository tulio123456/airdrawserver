import { putObject, r2Configured } from "../lib/r2.js";

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

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function clean(value) { return String(value || "sem_sessao").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90); }

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
    const type = (request.headers.get("content-type") || "").toLowerCase();
    const declaredMime = (url.searchParams.get("mime") || "").toLowerCase();
    const accepted = type.startsWith("image/jpeg") || type.startsWith("text/plain") || type.startsWith("application/octet-stream");
    if (!accepted || (declaredMime && declaredMime !== "image/jpeg")) {
      return Response.json({ error: "Envie uma captura JPEG." }, { status: 415, headers: cors(origin) });
    }

    try {
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 4 * 1024 * 1024) {
        return Response.json({ error: "Imagem vazia ou maior que 4 MB." }, { status: 413, headers: cors(origin) });
      }
      const session = clean(url.searchParams.get("session"));
      const now = Date.now();
      const inverse = String(9_999_999_999_999 - now).padStart(13, "0");
      const pathname = `captures/${inverse}-${now}-${session}.jpg`;
      await putObject(pathname, new Uint8Array(bytes), "image/jpeg", { session });
      return Response.json({ ok: true, pathname, storage: "cloudflare-r2" }, { status: 201, headers: cors(origin) });
    } catch (error) {
      console.error("capture r2 error", error);
      return Response.json({ error: "Falha ao salvar captura no Cloudflare R2." }, { status: 500, headers: cors(origin) });
    }
  }
};
