import { deleteObject, objectExists, r2Configured } from "../lib/r2.js";

function authorized(request) {
  const expected = String(process.env.ADMIN_PASSWORD || "");
  return expected && request.headers.get("authorization") === `Bearer ${expected}`;
}

export default {
  async fetch(request) {
    if (request.method !== "DELETE") return Response.json({ error: "Método não permitido" }, { status: 405 });
    if (!authorized(request)) return Response.json({ error: "Senha inválida." }, { status: 401 });
    if (!r2Configured()) return Response.json({ error: "Cloudflare R2 não conectado." }, { status: 500 });
    try {
      const { pathname } = await request.json();
      if (typeof pathname !== "string" || (!pathname.startsWith("captures/") && !pathname.startsWith("recordings/")) || pathname.includes("..")) {
        return Response.json({ error: "Caminho inválido." }, { status: 400 });
      }
      if (!(await objectExists(pathname))) return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
      await deleteObject(pathname);
      return Response.json({ ok: true, storage: "cloudflare-r2" });
    } catch (error) {
      console.error("admin delete r2", error);
      return Response.json({ error: "Falha ao excluir do Cloudflare R2." }, { status: 500 });
    }
  }
};
