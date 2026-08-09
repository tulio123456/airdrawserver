import { listObjects, r2Configured } from "../lib/r2.js";

function authorized(request) {
  const expected = String(process.env.ADMIN_PASSWORD || "");
  return expected && request.headers.get("authorization") === `Bearer ${expected}`;
}
function contentTypeFor(pathname = "") {
  const value = pathname.toLowerCase();
  if (value.endsWith(".jpg") || value.endsWith(".jpeg")) return "image/jpeg";
  if (value.endsWith(".png")) return "image/png";
  if (value.endsWith(".mp4")) return "video/mp4";
  if (value.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
}

export default {
  async fetch(request) {
    if (!authorized(request)) return Response.json({ error: "Senha inválida." }, { status: 401 });
    if (!r2Configured()) return Response.json({ error: "Cloudflare R2 não conectado." }, { status: 500 });
    try {
      const [captures, recordings] = await Promise.all([
        listObjects("captures/", 200),
        listObjects("recordings/", 200)
      ]);
      const items = [...captures.objects, ...recordings.objects]
        .map(item => ({
          pathname: item.pathname,
          size: item.size,
          uploadedAt: item.uploadedAt,
          contentType: contentTypeFor(item.pathname),
          kind: item.pathname.startsWith("recordings/") ? "video" : "image",
          storage: "cloudflare-r2"
        }))
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      return Response.json({ items, hasMore: Boolean(captures.hasMore || recordings.hasMore), storage: "cloudflare-r2" });
    } catch (error) {
      console.error("admin list r2", error);
      return Response.json({ error: "Falha ao listar mídias do Cloudflare R2." }, { status: 500 });
    }
  }
};
