function authorized(request) {
  const expected = String(process.env.ADMIN_PASSWORD || "");
  const header = request.headers.get("authorization") || "";
  return expected && header === `Bearer ${expected}`;
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Método não permitido" }, { status: 405 });
    }

    return Response.json(
      { ok: authorized(request) },
      { status: authorized(request) ? 200 : 401 }
    );
  }
};
