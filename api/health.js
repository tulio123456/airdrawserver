export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Método não permitido" }, { status: 405 });
    }

    return Response.json({
      ok: true,
      service: "AirDraw Server FINAL",
      functionFormat: "default fetch",
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
      originsConfigured: Boolean(process.env.ALLOWED_ORIGINS),
      time: new Date().toISOString()
    });
  }
};
