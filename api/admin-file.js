import { objectExists, r2Configured, signedGetUrl } from "../lib/r2.js";

function authorized(request) {
  const expected = String(process.env.ADMIN_PASSWORD || "");
  return expected && request.headers.get("authorization") === `Bearer ${expected}`;
}
function validPath(pathname) {
  return typeof pathname === "string" &&
    (pathname.startsWith("captures/") || pathname.startsWith("recordings/")) &&
    !pathname.includes("..");
}

export default {
  async fetch(request) {
    if (!authorized(request)) return Response.json({ error: "Não autorizado" }, { status: 401 });
    if (!r2Configured()) return Response.json({ error: "Cloudflare R2 não conectado." }, { status: 500 });
    const pathname = new URL(request.url).searchParams.get("pathname") || "";
    if (!validPath(pathname)) return Response.json({ error: "Caminho inválido" }, { status: 400 });
    try {
      if (!(await objectExists(pathname))) return Response.json({ error: "Não encontrado" }, { status: 404 });
      const url = await signedGetUrl(pathname, 900);
      return Response.json({ ok: true, url, expiresIn: 900, storage: "cloudflare-r2" }, {
        headers: { "Cache-Control": "private, no-store" }
      });
    } catch (error) {
      console.error("admin file r2", error);
      return Response.json({ error: "Erro ao gerar acesso temporário ao R2." }, { status: 500 });
    }
  }
};
