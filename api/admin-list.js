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
      const [captures, recordings] = await Promise.all([
        list({ prefix: "captures/", limit: 200 }),
        list({ prefix: "recordings/", limit: 200 })
      ]);

      const items = [...captures.blobs, ...recordings.blobs]
        .map(item => ({
          pathname: item.pathname,
          size: item.size,
          uploadedAt: item.uploadedAt,
          contentType: item.contentType,
          kind: item.pathname.startsWith("recordings/") ? "video" : "image"
        }))
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

      return Response.json({
        items,
        hasMore: Boolean(captures.hasMore || recordings.hasMore)
      });
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Falha ao listar mídias." }, { status: 500 });
    }
  }
};
