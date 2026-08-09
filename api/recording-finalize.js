import { del, get, list, put } from "@vercel/blob";

function allowedOrigin(request) {
  const origin = (request.headers.get("origin") || "").replace(/\/+$/, "");
  if (!origin) return null;

  const allowed = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(x => x.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (allowed.includes(origin)) return origin;

  // Também aceita previews Vercel do MESMO projeto configurado, evitando que
  // um deploy de preview falhe silenciosamente por CORS.
  try {
    const current = new URL(origin);
    if (current.protocol !== "https:") return null;
    for (const item of allowed) {
      const base = new URL(item);
      if (!base.hostname.endsWith(".vercel.app")) continue;
      const slug = base.hostname.slice(0, -".vercel.app".length);
      if (current.hostname === `${slug}.vercel.app` || current.hostname.startsWith(`${slug}-`) && current.hostname.endsWith(".vercel.app")) {
        return origin;
      }
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

function clean(value, fallback = "x") {
  const out = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return out || fallback;
}

function normalizeMime(value) {
  return String(value || "").toLowerCase().includes("mp4") ? "video/mp4" : "video/webm";
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForParts(prefix, expected) {
  let latest = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await list({ prefix, limit: 200 });
    latest = result.blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));
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
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Blob não conectado." }, { status: 500, headers: cors(origin) });

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
        const result = await get(part.pathname, { access: "private" });
        if (!result || result.statusCode !== 200) throw new Error(`Bloco indisponível: ${part.pathname}`);
        const buffer = await new Response(result.stream).arrayBuffer();
        total += buffer.byteLength;
        if (total > 12_000_000) throw new Error("Gravação excedeu o limite interno de montagem.");
        buffers.push(buffer);
      }

      const now = Date.now();
      const inverse = String(9_999_999_999_999 - now).padStart(13, "0");
      const file = new Blob(buffers, { type: mime });
      const result = await put(`recordings/${inverse}-${now}-${recording}-${session}.${ext}`, file, {
        access: "private",
        addRandomSuffix: true,
        contentType: mime
      });

      try { await del(parts.map(part => part.url)); } catch (cleanupError) { console.warn("recording parts cleanup", cleanupError); }

      return Response.json({ ok: true, pathname: result.pathname, size: total }, { status: 201, headers: cors(origin) });
    } catch (error) {
      console.error("recording finalize error", error);
      return Response.json({ error: "Falha ao montar a gravação final." }, { status: 500, headers: cors(origin) });
    }
  }
};
