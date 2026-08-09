import { put } from "@vercel/blob";

function allowedOrigin(request) {
  const origin = (request.headers.get("origin") || "").replace(/\/+$/, "");
  const allowed = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(x => x.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  return origin && allowed.includes(origin) ? origin : null;
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

function clean(value) {
  return String(value || "sem_sessao")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 90);
}

function extensionFor(type) {
  return type.includes("mp4") ? "mp4" : "webm";
}

export default {
  async fetch(request) {
    const origin = allowedOrigin(request);

    if (request.method === "OPTIONS") {
      if (!origin) {
        return Response.json({ error: "Origem não autorizada" }, { status: 403 });
      }
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Método não permitido" }, { status: 405 });
    }

    if (!origin) {
      return Response.json(
        { error: "Origem não autorizada. Confira ALLOWED_ORIGINS." },
        { status: 403 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json(
        { error: "BLOB_READ_WRITE_TOKEN não está disponível neste deployment." },
        { status: 500, headers: cors(origin) }
      );
    }

    const type = (request.headers.get("content-type") || "").toLowerCase();
    if (!type.startsWith("video/webm") && !type.startsWith("video/mp4")) {
      return Response.json(
        { error: "Envie video/webm ou video/mp4." },
        { status: 415, headers: cors(origin) }
      );
    }

    try {
      const bytes = await request.arrayBuffer();

      // Mantém margem abaixo do limite de 4,5 MB das Vercel Functions.
      if (!bytes.byteLength || bytes.byteLength > 4_200_000) {
        return Response.json(
          { error: "Vídeo vazio ou maior que 4,2 MB." },
          { status: 413, headers: cors(origin) }
        );
      }

      const url = new URL(request.url);
      const session = clean(url.searchParams.get("session"));
      const now = Date.now();
      const inverse = String(9_999_999_999_999 - now).padStart(13, "0");
      const ext = extensionFor(type);
      const contentType = ext === "mp4" ? "video/mp4" : "video/webm";
      const file = new Blob([bytes], { type: contentType });

      const result = await put(
        `recordings/${inverse}-${now}-${session}.${ext}`,
        file,
        {
          access: "private",
          addRandomSuffix: true,
          contentType
        }
      );

      return Response.json(
        { ok: true, pathname: result.pathname },
        { status: 201, headers: cors(origin) }
      );
    } catch (error) {
      console.error("recording error", error);
      return Response.json(
        { error: "Falha ao salvar gravação no Blob." },
        { status: 500, headers: cors(origin) }
      );
    }
  }
};
