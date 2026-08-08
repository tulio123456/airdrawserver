import { list } from "@vercel/blob";

function authorized(request) {
  const expected = String(process.env.ADMIN_PASSWORD || "");
  return expected && request.headers.get("authorization") === `Bearer ${expected}`;
}

export default {
  async fetch(request) {
    if (!authorized(request)) {
      return Response.json({ error: "Senha inválida." }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json({ error: "Blob não conectado." }, { status: 500 });
    }

    try {
      const result = await list({ prefix: "captures/", limit: 200 });

      return Response.json({
        items: result.blobs.map(item => ({
          pathname: item.pathname,
          size: item.size,
          uploadedAt: item.uploadedAt,
          contentType: item.contentType
        })),
        hasMore: Boolean(result.hasMore)
      });
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Falha ao listar fotos." }, { status: 500 });
    }
  }
};
