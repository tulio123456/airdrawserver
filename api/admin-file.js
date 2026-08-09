import { get } from "@vercel/blob";

function authorized(request) {
  const expected = String(process.env.ADMIN_PASSWORD || "");
  return expected && request.headers.get("authorization") === `Bearer ${expected}`;
}

export default {
  async fetch(request) {
    if (!authorized(request)) {
      return new Response("Não autorizado", { status: 401 });
    }

    const pathname = new URL(request.url).searchParams.get("pathname") || "";

    if ((!pathname.startsWith("captures/") && !pathname.startsWith("recordings/")) || pathname.includes("..")) {
      return new Response("Caminho inválido", { status: 400 });
    }

    try {
      const result = await get(pathname, { access: "private" });

      if (!result || result.statusCode === 404) {
        return new Response("Não encontrado", { status: 404 });
      }

      if (result.statusCode !== 200) {
        return new Response("Não encontrado", { status: 404 });
      }

      return new Response(result.stream, {
        status: 200,
        headers: {
          "Content-Type": result.blob.contentType || "application/octet-stream",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch (error) {
      console.error(error);
      return new Response("Erro ao ler Blob", { status: 500 });
    }
  }
};
