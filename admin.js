const login = document.querySelector("#login");
const dashboard = document.querySelector("#dashboard");
const form = document.querySelector("#form");
const passwordInput = document.querySelector("#password");
const errorBox = document.querySelector("#error");
const gallery = document.querySelector("#gallery");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const refresh = document.querySelector("#refresh");
const logout = document.querySelector("#logout");
const dialog = document.querySelector("#dialog");
const preview = document.querySelector("#preview");
const close = document.querySelector("#close");

let password = "";

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Authorization": `Bearer ${password}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const type = response.headers.get("content-type") || "";
  const data = type.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }

  return data;
}

function bytes(n) {
  n = Number(n || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function loadImage(pathname, img) {
  const response = await fetch(
    `/api/admin-file?pathname=${encodeURIComponent(pathname)}`,
    {
      headers: { "Authorization": `Bearer ${password}` },
      cache: "no-store"
    }
  );

  if (!response.ok) throw new Error("Não foi possível carregar a foto.");
  const blob = await response.blob();
  img.src = URL.createObjectURL(blob);
}

async function load() {
  const data = await request("/api/admin-list");
  const items = data.items || [];

  count.textContent = `${items.length} captura(s)`;
  gallery.innerHTML = "";
  empty.classList.toggle("hidden", items.length > 0);

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "photo";

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = "Captura";
    loadImage(item.pathname, img).catch(console.error);

    img.addEventListener("click", async () => {
      preview.removeAttribute("src");
      await loadImage(item.pathname, preview);
      dialog.showModal();
    });

    const meta = document.createElement("div");
    meta.className = "meta";

    const date = document.createElement("small");
    date.textContent = new Date(item.uploadedAt).toLocaleString("pt-BR");

    const size = document.createElement("small");
    size.textContent = bytes(item.size);

    const remove = document.createElement("button");
    remove.textContent = "Excluir";
    remove.addEventListener("click", async () => {
      if (!confirm("Excluir esta foto?")) return;
      await request("/api/admin-delete", {
        method: "DELETE",
        body: JSON.stringify({ pathname: item.pathname })
      });
      await load();
    });

    meta.append(date, size, remove);
    card.append(img, meta);
    gallery.append(card);
  }
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  errorBox.textContent = "";
  password = passwordInput.value;

  try {
    await request("/api/admin-check");
    login.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await load();
  } catch (error) {
    password = "";
    errorBox.textContent = error.message;
  }
});

refresh.addEventListener("click", () => load().catch(e => alert(e.message)));
logout.addEventListener("click", () => {
  password = "";
  passwordInput.value = "";
  dashboard.classList.add("hidden");
  login.classList.remove("hidden");
});
close.addEventListener("click", () => dialog.close());
