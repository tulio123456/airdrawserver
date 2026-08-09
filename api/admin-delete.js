import { del, list } from "@vercel/blob";

function authorized(request) {
  const expected = String(process.env.ADMIN_PASSWORD || "");
  return expected && request.headers.get("authorization") === `Bearer ${expected}`;
}

export default {
  async fetch(request) {
    if (request.method !== "DELETE") {
      return Response.json({ error: "Método não permitido" }, { status: 405 });
    }

    if (!authorized(request)) {
      return Response.json({ error: "Senha inválida." }, { status: 401 });
    }

    try {
      const { pathname } = await request.json();

      if (
        typeof pathname !== "string" ||
        (!pathname.startsWith("captures/") && !pathname.startsWith("recordings/")) ||
        pathname.includes("..")
      ) {
        return Response.json({ error: "Caminho inválido." }, { status: 400 });
      }

      const result = await list({ prefix: pathname, limit: 5 });
      const blob = result.blobs.find(x => x.pathname === pathname);

      if (!blob) {
        return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
      }

      await del(blob.url);
      return Response.json({ ok: true });
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Falha ao excluir." }, { status: 500 });
    }
  }
};
