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
const search = document.querySelector("#search");
const clearSearch = document.querySelector("#clearSearch");
const sort = document.querySelector("#sort");
const density = document.querySelector("#density");
const autoRefresh = document.querySelector("#autoRefresh");
const filterInfo = document.querySelector("#filterInfo");
const statCount = document.querySelector("#statCount");
const statSize = document.querySelector("#statSize");
const statLatest = document.querySelector("#statLatest");
const statLatestTime = document.querySelector("#statLatestTime");
const toast = document.querySelector("#toast");

const viewerName = document.querySelector("#viewerName");
const detailName = document.querySelector("#detailName");
const detailDate = document.querySelector("#detailDate");
const detailSize = document.querySelector("#detailSize");
const detailType = document.querySelector("#detailType");
const detailIndex = document.querySelector("#detailIndex");
const detailPath = document.querySelector("#detailPath");
const copyName = document.querySelector("#copyName");
const copyPath = document.querySelector("#copyPath");
const download = document.querySelector("#download");
const fullscreen = document.querySelector("#fullscreen");
const prevImage = document.querySelector("#prevImage");
const nextImage = document.querySelector("#nextImage");
const imageStage = document.querySelector("#imageStage");
const imageTransform = document.querySelector("#imageTransform");
const imageLoading = document.querySelector("#imageLoading");
const zoomOut = document.querySelector("#zoomOut");
const zoomIn = document.querySelector("#zoomIn");
const zoomValue = document.querySelector("#zoomValue");
const fitImage = document.querySelector("#fitImage");
const actualSize = document.querySelector("#actualSize");
const rotateLeft = document.querySelector("#rotateLeft");
const rotateRight = document.querySelector("#rotateRight");
const flipImage = document.querySelector("#flipImage");
const toggleInfo = document.querySelector("#toggleInfo");
const viewerBody = document.querySelector(".viewerBody");

let password = "";
let items = [];
let filteredItems = [];
let currentIndex = -1;
let autoRefreshTimer = null;
let toastTimer = null;
let loadToken = 0;
let currentPreviewUrl = "";
let cardObjectUrls = new Set();

const view = {
  zoom: 1,
  rotation: 0,
  flipX: 1,
  x: 0,
  y: 0,
  panning: false,
  pointerX: 0,
  pointerY: 0,
  startX: 0,
  startY: 0
};

const prefs = {
  sort: localStorage.getItem("airdrawAdminSort") || "newest",
  density: localStorage.getItem("airdrawAdminDensity") || "comfortable",
  autoRefresh: localStorage.getItem("airdrawAdminAutoRefresh") === "1"
};

sort.value = prefs.sort;
density.value = prefs.density;
autoRefresh.checked = prefs.autoRefresh;
applyDensity();

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
  const data = type.includes("application/json") ? await response.json() : null;

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

function fileName(pathname = "") {
  return pathname.split("/").pop() || pathname || "captura.jpg";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

async function fetchImageBlob(pathname) {
  const response = await fetch(`/api/admin-file?pathname=${encodeURIComponent(pathname)}`, {
    headers: { "Authorization": `Bearer ${password}` },
    cache: "no-store"
  });

  if (!response.ok) throw new Error("Não foi possível carregar a foto.");
  return response.blob();
}

async function loadImage(pathname, img, trackCardUrl = false) {
  const blob = await fetchImageBlob(pathname);
  const url = URL.createObjectURL(blob);
  img.src = url;
  if (trackCardUrl) cardObjectUrls.add(url);
  return { blob, url };
}

function releaseCardUrls() {
  for (const url of cardObjectUrls) URL.revokeObjectURL(url);
  cardObjectUrls.clear();
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || "captura.jpg";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

async function downloadItem(item) {
  showToast("Preparando download...");
  const blob = await fetchImageBlob(item.pathname);
  downloadBlob(blob, fileName(item.pathname));
}

function sortItems(list) {
  const sorted = [...list];
  switch (sort.value) {
    case "oldest":
      sorted.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      break;
    case "largest":
      sorted.sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
      break;
    case "smallest":
      sorted.sort((a, b) => Number(a.size || 0) - Number(b.size || 0));
      break;
    case "name":
      sorted.sort((a, b) => fileName(a.pathname).localeCompare(fileName(b.pathname), "pt-BR"));
      break;
    default:
      sorted.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }
  return sorted;
}

function applyFilters() {
  const q = search.value.trim().toLocaleLowerCase("pt-BR");
  const filtered = q
    ? items.filter(item => {
        const haystack = [
          item.pathname,
          fileName(item.pathname),
          formatDate(item.uploadedAt),
          item.contentType,
          bytes(item.size)
        ].join(" ").toLocaleLowerCase("pt-BR");
        return haystack.includes(q);
      })
    : items;

  filteredItems = sortItems(filtered);
  clearSearch.classList.toggle("hidden", !q);
  filterInfo.classList.toggle("hidden", !q);
  if (q) filterInfo.innerHTML = `<strong>${filteredItems.length}</strong> resultado(s) para “${escapeHtml(search.value.trim())}”`;
  renderGallery();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function updateStats() {
  statCount.textContent = String(items.length);
  statSize.textContent = bytes(items.reduce((sum, item) => sum + Number(item.size || 0), 0));
  const newest = [...items].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  statLatest.textContent = newest ? shortDate(newest.uploadedAt) : "—";
  statLatestTime.textContent = newest ? formatDate(newest.uploadedAt) : "sem capturas";
  count.textContent = `${items.length} captura(s)`;
}

function renderGallery() {
  releaseCardUrls();
  gallery.innerHTML = "";
  empty.classList.toggle("hidden", filteredItems.length > 0);
  empty.textContent = items.length ? "Nenhuma captura encontrada com esse filtro." : "Nenhuma foto recebida ainda.";

  filteredItems.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "photo";

    const imageWrap = document.createElement("div");
    imageWrap.className = "imageWrap";

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = "Captura";
    img.loading = "lazy";
    loadImage(item.pathname, img, true).catch(() => {
      img.alt = "Falha ao carregar captura";
    });

    img.addEventListener("click", () => openViewer(index));

    const overlay = document.createElement("div");
    overlay.className = "imageOverlay";
    overlay.innerHTML = `<span>⌕ Abrir</span><span>${bytes(item.size)}</span>`;
    imageWrap.append(img, overlay);

    const meta = document.createElement("div");
    meta.className = "meta";

    const name = document.createElement("strong");
    name.className = "fileName";
    name.title = fileName(item.pathname);
    name.textContent = fileName(item.pathname);

    const line = document.createElement("div");
    line.className = "metaLine";
    const date = document.createElement("small");
    date.textContent = formatDate(item.uploadedAt);
    const size = document.createElement("small");
    size.textContent = bytes(item.size);
    line.append(date, size);

    const actions = document.createElement("div");
    actions.className = "cardActions";

    const downloadButton = document.createElement("button");
    downloadButton.className = "downloadCard";
    downloadButton.textContent = "⇩ Baixar";
    downloadButton.addEventListener("click", async event => {
      event.stopPropagation();
      try { await downloadItem(item); } catch (error) { alert(error.message); }
    });

    const remove = document.createElement("button");
    remove.className = "removeCard";
    remove.textContent = "Excluir";
    remove.addEventListener("click", async () => {
      if (!confirm("Excluir esta foto?")) return;
      await request("/api/admin-delete", {
        method: "DELETE",
        body: JSON.stringify({ pathname: item.pathname })
      });
      await load(false);
    });

    actions.append(downloadButton, remove);
    meta.append(name, line, actions);
    card.append(imageWrap, meta);
    gallery.append(card);
  });
}

async function load(showFeedback = true) {
  if (showFeedback) refresh.disabled = true;
  try {
    const data = await request("/api/admin-list");
    items = data.items || [];
    updateStats();
    applyFilters();
    if (showFeedback) showToast("Capturas atualizadas");
  } finally {
    refresh.disabled = false;
  }
}

function resetView() {
  view.zoom = 1;
  view.rotation = 0;
  view.flipX = 1;
  view.x = 0;
  view.y = 0;
  applyTransform();
}

function clampZoom(value) {
  return Math.min(8, Math.max(.1, value));
}

function applyTransform() {
  imageTransform.style.transform = `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) rotate(${view.rotation}deg) scale(${view.zoom * view.flipX}, ${view.zoom})`;
  zoomValue.textContent = `${Math.round(view.zoom * 100)}%`;
  imageStage.style.cursor = view.zoom > 1 ? (view.panning ? "grabbing" : "grab") : "default";
}

function setZoom(nextZoom, anchorX = null, anchorY = null) {
  const oldZoom = view.zoom;
  const newZoom = clampZoom(nextZoom);
  if (anchorX != null && anchorY != null && oldZoom !== 0) {
    const rect = imageStage.getBoundingClientRect();
    const px = anchorX - rect.left - rect.width / 2 - view.x;
    const py = anchorY - rect.top - rect.height / 2 - view.y;
    const ratio = newZoom / oldZoom;
    view.x -= px * (ratio - 1);
    view.y -= py * (ratio - 1);
  }
  view.zoom = newZoom;
  applyTransform();
}

function fitPreview() {
  if (!preview.naturalWidth || !preview.naturalHeight) return;
  const rect = imageStage.getBoundingClientRect();
  const rotated = Math.abs(view.rotation % 180) === 90;
  const imageWidth = rotated ? preview.naturalHeight : preview.naturalWidth;
  const imageHeight = rotated ? preview.naturalWidth : preview.naturalHeight;
  const padding = 46;
  const scale = Math.min((rect.width - padding) / imageWidth, (rect.height - padding) / imageHeight, 1);
  view.zoom = clampZoom(scale);
  view.x = 0;
  view.y = 0;
  applyTransform();
}

async function openViewer(index) {
  if (!filteredItems[index]) return;
  currentIndex = index;
  const item = filteredItems[index];
  const token = ++loadToken;

  resetView();
  imageLoading.classList.remove("hidden");
  preview.removeAttribute("src");
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = "";
  }

  viewerName.textContent = fileName(item.pathname);
  detailName.textContent = fileName(item.pathname);
  detailDate.textContent = formatDate(item.uploadedAt);
  detailSize.textContent = bytes(item.size);
  detailType.textContent = item.contentType || "image/jpeg";
  detailIndex.textContent = `${index + 1} / ${filteredItems.length}`;
  detailPath.textContent = item.pathname;
  prevImage.disabled = index <= 0;
  nextImage.disabled = index >= filteredItems.length - 1;

  if (!dialog.open) dialog.showModal();

  try {
    const { url } = await loadImage(item.pathname, preview, false);
    if (token !== loadToken) {
      URL.revokeObjectURL(url);
      return;
    }
    currentPreviewUrl = url;
    await preview.decode().catch(() => {});
    fitPreview();
  } catch (error) {
    if (token === loadToken) showToast(error.message);
  } finally {
    if (token === loadToken) imageLoading.classList.add("hidden");
  }
}

function navigate(delta) {
  const next = currentIndex + delta;
  if (next >= 0 && next < filteredItems.length) openViewer(next);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast("Não foi possível copiar");
  }
}

function applyDensity() {
  gallery.classList.toggle("compact", density.value === "compact");
  gallery.classList.toggle("large", density.value === "large");
}

function configureAutoRefresh() {
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
  if (autoRefresh.checked && password) {
    autoRefreshTimer = setInterval(() => load(false).catch(console.error), 12000);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  errorBox.textContent = "";
  password = passwordInput.value;

  try {
    await request("/api/admin-check");
    login.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await load(false);
    configureAutoRefresh();
  } catch (error) {
    password = "";
    errorBox.textContent = error.message;
  }
});

refresh.addEventListener("click", () => load().catch(error => alert(error.message)));
logout.addEventListener("click", () => {
  password = "";
  passwordInput.value = "";
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
  releaseCardUrls();
  dashboard.classList.add("hidden");
  login.classList.remove("hidden");
});

search.addEventListener("input", applyFilters);
clearSearch.addEventListener("click", () => {
  search.value = "";
  search.focus();
  applyFilters();
});
sort.addEventListener("change", () => {
  localStorage.setItem("airdrawAdminSort", sort.value);
  applyFilters();
});
density.addEventListener("change", () => {
  localStorage.setItem("airdrawAdminDensity", density.value);
  applyDensity();
});
autoRefresh.addEventListener("change", () => {
  localStorage.setItem("airdrawAdminAutoRefresh", autoRefresh.checked ? "1" : "0");
  configureAutoRefresh();
  showToast(autoRefresh.checked ? "Autoatualização ativada" : "Autoatualização desativada");
});

close.addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => {
  ++loadToken;
  if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
  currentPreviewUrl = "";
  preview.removeAttribute("src");
  resetView();
});
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

download.addEventListener("click", async () => {
  const item = filteredItems[currentIndex];
  if (!item) return;
  try { await downloadItem(item); } catch (error) { showToast(error.message); }
});
copyName.addEventListener("click", () => {
  const item = filteredItems[currentIndex];
  if (item) copyText(fileName(item.pathname), "Nome copiado");
});
copyPath.addEventListener("click", () => {
  const item = filteredItems[currentIndex];
  if (item) copyText(item.pathname, "Caminho copiado");
});
prevImage.addEventListener("click", () => navigate(-1));
nextImage.addEventListener("click", () => navigate(1));
zoomIn.addEventListener("click", () => setZoom(view.zoom * 1.2));
zoomOut.addEventListener("click", () => setZoom(view.zoom / 1.2));
zoomValue.addEventListener("click", () => { view.zoom = 1; view.x = 0; view.y = 0; applyTransform(); });
actualSize.addEventListener("click", () => { view.zoom = 1; view.x = 0; view.y = 0; applyTransform(); });
fitImage.addEventListener("click", fitPreview);
rotateLeft.addEventListener("click", () => { view.rotation -= 90; view.x = 0; view.y = 0; fitPreview(); });
rotateRight.addEventListener("click", () => { view.rotation += 90; view.x = 0; view.y = 0; fitPreview(); });
flipImage.addEventListener("click", () => { view.flipX *= -1; applyTransform(); });
toggleInfo.addEventListener("click", () => viewerBody.classList.toggle("showInfo"));
fullscreen.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await dialog.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast("Tela cheia indisponível neste navegador");
  }
});

imageStage.addEventListener("wheel", event => {
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  setZoom(view.zoom * factor, event.clientX, event.clientY);
}, { passive: false });

imageStage.addEventListener("dblclick", event => {
  if (view.zoom < 1.5) setZoom(Math.max(2, view.zoom * 2), event.clientX, event.clientY);
  else fitPreview();
});

imageStage.addEventListener("pointerdown", event => {
  if (view.zoom <= 1 && Math.abs(view.rotation % 180) !== 90) return;
  view.panning = true;
  view.pointerX = event.clientX;
  view.pointerY = event.clientY;
  view.startX = view.x;
  view.startY = view.y;
  imageStage.classList.add("isPanning");
  imageStage.setPointerCapture?.(event.pointerId);
});
imageStage.addEventListener("pointermove", event => {
  if (!view.panning) return;
  view.x = view.startX + (event.clientX - view.pointerX);
  view.y = view.startY + (event.clientY - view.pointerY);
  applyTransform();
});
function stopPanning(event) {
  if (!view.panning) return;
  view.panning = false;
  imageStage.classList.remove("isPanning");
  imageStage.releasePointerCapture?.(event.pointerId);
  applyTransform();
}
imageStage.addEventListener("pointerup", stopPanning);
imageStage.addEventListener("pointercancel", stopPanning);

window.addEventListener("resize", () => {
  if (dialog.open && preview.src) fitPreview();
});

document.addEventListener("keydown", event => {
  if (!dialog.open) return;
  const key = event.key.toLowerCase();
  if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1); }
  else if (event.key === "ArrowRight") { event.preventDefault(); navigate(1); }
  else if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoom(view.zoom * 1.2); }
  else if (event.key === "-") { event.preventDefault(); setZoom(view.zoom / 1.2); }
  else if (event.key === "0") { event.preventDefault(); fitPreview(); }
  else if (key === "r") { event.preventDefault(); view.rotation += 90; fitPreview(); }
  else if (key === "d") { event.preventDefault(); download.click(); }
});
