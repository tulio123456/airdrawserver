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
const videoPreview = document.querySelector("#videoPreview");
const close = document.querySelector("#close");
const search = document.querySelector("#search");
const clearSearch = document.querySelector("#clearSearch");
const sort = document.querySelector("#sort");
const density = document.querySelector("#density");
const mediaType = document.querySelector("#mediaType");
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
const exportEdited = document.querySelector("#exportEdited");
const detailDimensions = document.querySelector("#detailDimensions");
const detailRatio = document.querySelector("#detailRatio");
const brightness = document.querySelector("#brightness");
const contrast = document.querySelector("#contrast");
const saturation = document.querySelector("#saturation");
const hue = document.querySelector("#hue");
const brightnessValue = document.querySelector("#brightnessValue");
const contrastValue = document.querySelector("#contrastValue");
const saturationValue = document.querySelector("#saturationValue");
const hueValue = document.querySelector("#hueValue");
const resetAdjustments = document.querySelector("#resetAdjustments");
const fitWidth = document.querySelector("#fitWidth");
const fitHeight = document.querySelector("#fitHeight");
const flipVertical = document.querySelector("#flipVertical");
const compareOriginal = document.querySelector("#compareOriginal");
const compareBadge = document.querySelector("#compareBadge");
const focusMode = document.querySelector("#focusMode");
const cycleStageBg = document.querySelector("#cycleStageBg");
const miniMap = document.querySelector("#miniMap");
const miniMapImage = document.querySelector("#miniMapImage");
const miniMapViewport = document.querySelector("#miniMapViewport");
const quickLookButtons = [...document.querySelectorAll("[data-look]")];

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
  flipY: 1,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  comparing: false,
  focus: false,
  stageBg: 0,
  x: 0,
  y: 0,
  panning: false,
  pointerX: 0,
  pointerY: 0,
  startX: 0,
  startY: 0
};

const activePointers = new Map();
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let pinchCenter = null;
const stageBackgrounds = ["bg-grid", "bg-dark", "bg-light", "bg-neutral"];

const prefs = {
  sort: localStorage.getItem("airdrawAdminSort") || "newest",
  density: localStorage.getItem("airdrawAdminDensity") || "comfortable",
  autoRefresh: localStorage.getItem("airdrawAdminAutoRefresh") === "1",
  mediaType: localStorage.getItem("airdrawAdminMediaType") || "all"
};

sort.value = prefs.sort;
density.value = prefs.density;
autoRefresh.checked = prefs.autoRefresh;
mediaType.value = prefs.mediaType;
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

async function fetchMediaBlob(pathname) {
  const ticket = await fetch(`/api/admin-file?pathname=${encodeURIComponent(pathname)}`, {
    headers: { "Authorization": `Bearer ${password}` },
    cache: "no-store"
  });

  const data = await ticket.json().catch(() => null);
  if (!ticket.ok || !data?.url) {
    throw new Error(data?.error || "Não foi possível gerar o acesso ao arquivo.");
  }

  const response = await fetch(data.url, { cache: "no-store", mode: "cors" });
  if (!response.ok) throw new Error("Não foi possível carregar o arquivo do Cloudflare R2.");
  return response.blob();
}

async function loadImage(pathname, img, trackCardUrl = false) {
  const blob = await fetchMediaBlob(pathname);
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
  const blob = await fetchMediaBlob(item.pathname);
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
  const byType = mediaType.value === "all" ? items : items.filter(item => {
    const kind = item.kind || ((item.contentType || "").startsWith("video/") ? "video" : "image");
    return kind === mediaType.value;
  });
  const filtered = q
    ? byType.filter(item => {
        const haystack = [
          item.pathname,
          fileName(item.pathname),
          formatDate(item.uploadedAt),
          item.contentType,
          item.kind,
          bytes(item.size)
        ].join(" ").toLocaleLowerCase("pt-BR");
        return haystack.includes(q);
      })
    : byType;

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
  const videoCount = items.filter(item => (item.kind === "video") || (item.contentType || "").startsWith("video/")).length;
  const imageCount = items.length - videoCount;
  statCount.textContent = String(items.length);
  statSize.textContent = bytes(items.reduce((sum, item) => sum + Number(item.size || 0), 0));
  const newest = [...items].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  statLatest.textContent = newest ? shortDate(newest.uploadedAt) : "—";
  statLatestTime.textContent = newest ? formatDate(newest.uploadedAt) : "sem arquivos";
  count.textContent = `${videoCount} gravação(ões) • ${imageCount} captura(s)`;
}

function renderGallery() {
  releaseCardUrls();
  gallery.innerHTML = "";
  empty.classList.toggle("hidden", filteredItems.length > 0);
  empty.textContent = items.length ? "Nenhum arquivo encontrado com esse filtro." : "Nenhuma mídia recebida ainda.";

  filteredItems.forEach((item, index) => {
    const isVideo = item.kind === "video" || (item.contentType || "").startsWith("video/") || item.pathname.startsWith("recordings/");
    const card = document.createElement("article");
    card.className = `photo ${isVideo ? "videoCard" : ""}`;

    const imageWrap = document.createElement("div");
    imageWrap.className = "imageWrap";

    if (isVideo) {
      const videoThumb = document.createElement("button");
      videoThumb.type = "button";
      videoThumb.className = "videoThumb";
      videoThumb.innerHTML = `<span class="videoPlay">▶</span><b>GRAVAÇÃO</b><small>${escapeHtml((item.contentType || "video").replace("video/", "").toUpperCase())}</small>`;
      videoThumb.addEventListener("click", () => openViewer(index));
      imageWrap.append(videoThumb);
    } else {
      const img = document.createElement("img");
      img.className = "thumb";
      img.alt = "Captura";
      img.loading = "lazy";
      loadImage(item.pathname, img, true).catch(() => { img.alt = "Falha ao carregar captura"; });
      img.addEventListener("click", () => openViewer(index));
      imageWrap.append(img);
    }

    const overlay = document.createElement("div");
    overlay.className = "imageOverlay";
    overlay.innerHTML = `<span>${isVideo ? "▶ Reproduzir" : "⌕ Abrir"}</span><span>${bytes(item.size)}</span>`;
    imageWrap.append(overlay);

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
      if (!confirm(`Excluir ${isVideo ? "esta gravação" : "esta foto"}?`)) return;
      await request("/api/admin-delete", { method: "DELETE", body: JSON.stringify({ pathname: item.pathname }) });
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
    if (showFeedback) showToast("Mídia atualizada");
  } finally {
    refresh.disabled = false;
  }
}

function resetView() {
  view.zoom = 1;
  view.rotation = 0;
  view.flipX = 1;
  view.flipY = 1;
  view.x = 0;
  view.y = 0;
  applyTransform();
}

function clampZoom(value) {
  return Math.min(16, Math.max(.05, value));
}

function currentFilter() {
  if (view.comparing) return "none";
  return `brightness(${view.brightness}%) contrast(${view.contrast}%) saturate(${view.saturation}%) hue-rotate(${view.hue}deg)`;
}

function applyAdjustments() {
  preview.style.filter = currentFilter();
  brightness.value = String(view.brightness);
  contrast.value = String(view.contrast);
  saturation.value = String(view.saturation);
  hue.value = String(view.hue);
  brightnessValue.textContent = `${view.brightness}%`;
  contrastValue.textContent = `${view.contrast}%`;
  saturationValue.textContent = `${view.saturation}%`;
  hueValue.textContent = `${view.hue}°`;
  compareBadge.classList.toggle("hidden", !view.comparing);
}

function updateMiniMap() {
  const rotated = Math.abs(view.rotation % 180) === 90;
  const shouldShow = preview.naturalWidth && view.zoom > 1.35 && !rotated;
  miniMap.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) return;
  if (miniMapImage.src !== preview.src) miniMapImage.src = preview.src;
  const stageRect = imageStage.getBoundingClientRect();
  const displayW = preview.naturalWidth * view.zoom;
  const displayH = preview.naturalHeight * view.zoom;
  const visibleW = Math.min(1, stageRect.width / displayW);
  const visibleH = Math.min(1, stageRect.height / displayH);
  const centerX = .5 - view.x / displayW;
  const centerY = .5 - view.y / displayH;
  miniMapViewport.style.width = `${visibleW * 100}%`;
  miniMapViewport.style.height = `${visibleH * 100}%`;
  miniMapViewport.style.left = `${Math.max(0, Math.min(1 - visibleW, centerX - visibleW / 2)) * 100}%`;
  miniMapViewport.style.top = `${Math.max(0, Math.min(1 - visibleH, centerY - visibleH / 2)) * 100}%`;
}

function applyTransform() {
  imageTransform.style.transform = `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) rotate(${view.rotation}deg) scale(${view.zoom * view.flipX}, ${view.zoom * view.flipY})`;
  zoomValue.textContent = `${Math.round(view.zoom * 100)}%`;
  imageStage.style.cursor = view.zoom > 1 ? (view.panning ? "grabbing" : "grab") : "default";
  applyAdjustments();
  updateMiniMap();
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

function fitPreviewWidth() {
  if (!preview.naturalWidth || !preview.naturalHeight) return;
  const rect = imageStage.getBoundingClientRect();
  const rotated = Math.abs(view.rotation % 180) === 90;
  const imageWidth = rotated ? preview.naturalHeight : preview.naturalWidth;
  view.zoom = clampZoom((rect.width - 36) / imageWidth);
  view.x = 0;
  view.y = 0;
  applyTransform();
}

function fitPreviewHeight() {
  if (!preview.naturalWidth || !preview.naturalHeight) return;
  const rect = imageStage.getBoundingClientRect();
  const rotated = Math.abs(view.rotation % 180) === 90;
  const imageHeight = rotated ? preview.naturalWidth : preview.naturalHeight;
  view.zoom = clampZoom((rect.height - 36) / imageHeight);
  view.x = 0;
  view.y = 0;
  applyTransform();
}

function gcd(a, b) {
  a = Math.round(a); b = Math.round(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function setImageDetails() {
  if (!preview.naturalWidth || !preview.naturalHeight) return;
  detailDimensions.textContent = `${preview.naturalWidth} × ${preview.naturalHeight}`;
  const d = gcd(preview.naturalWidth, preview.naturalHeight);
  const rw = Math.round(preview.naturalWidth / d);
  const rh = Math.round(preview.naturalHeight / d);
  detailRatio.textContent = rw < 100 && rh < 100 ? `${rw}:${rh}` : (preview.naturalWidth / preview.naturalHeight).toFixed(2);
}

async function openViewer(index) {
  if (!filteredItems[index]) return;
  currentIndex = index;
  const item = filteredItems[index];
  const isVideo = item.kind === "video" || (item.contentType || "").startsWith("video/") || item.pathname.startsWith("recordings/");
  const token = ++loadToken;

  resetView();
  imageLoading.classList.remove("hidden");
  preview.removeAttribute("src");
  preview.classList.toggle("hidden", isVideo);
  videoPreview.classList.toggle("hidden", !isVideo);
  videoPreview.pause();
  videoPreview.removeAttribute("src");
  dialog.classList.toggle("videoMode", isVideo);
  if (currentPreviewUrl) { URL.revokeObjectURL(currentPreviewUrl); currentPreviewUrl = ""; }

  viewerName.textContent = fileName(item.pathname);
  detailName.textContent = fileName(item.pathname);
  detailDate.textContent = formatDate(item.uploadedAt);
  detailSize.textContent = bytes(item.size);
  detailType.textContent = item.contentType || (isVideo ? "video/webm" : "image/jpeg");
  detailIndex.textContent = `${index + 1} / ${filteredItems.length}`;
  detailPath.textContent = item.pathname;
  detailDimensions.textContent = "—";
  detailRatio.textContent = "—";
  prevImage.disabled = index <= 0;
  nextImage.disabled = index >= filteredItems.length - 1;

  if (!dialog.open) dialog.showModal();

  try {
    if (isVideo) {
      const blob = await fetchMediaBlob(item.pathname);
      if (token !== loadToken) return;
      const url = URL.createObjectURL(blob);
      currentPreviewUrl = url;
      videoPreview.src = url;
      await new Promise(resolve => {
        if (videoPreview.readyState >= 1) return resolve();
        videoPreview.addEventListener("loadedmetadata", resolve, { once: true });
        setTimeout(resolve, 1800);
      });
      if (videoPreview.videoWidth && videoPreview.videoHeight) {
        detailDimensions.textContent = `${videoPreview.videoWidth} × ${videoPreview.videoHeight}`;
        const d = gcd(videoPreview.videoWidth, videoPreview.videoHeight);
        detailRatio.textContent = `${Math.round(videoPreview.videoWidth / d)}:${Math.round(videoPreview.videoHeight / d)}`;
      }
      videoPreview.play().catch(() => {});
    } else {
      const { url } = await loadImage(item.pathname, preview, false);
      if (token !== loadToken) { URL.revokeObjectURL(url); return; }
      currentPreviewUrl = url;
      await preview.decode().catch(() => {});
      setImageDetails();
      miniMapImage.src = url;
      fitPreview();
    }
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

function resetImageAdjustments() {
  view.brightness = 100;
  view.contrast = 100;
  view.saturation = 100;
  view.hue = 0;
  applyAdjustments();
}

function applyLook(name) {
  const looks = {
    clean: { brightness: 104, contrast: 104, saturation: 100, hue: 0 },
    vivid: { brightness: 104, contrast: 112, saturation: 138, hue: 0 },
    mono: { brightness: 102, contrast: 116, saturation: 0, hue: 0 },
    warm: { brightness: 106, contrast: 105, saturation: 112, hue: -10 }
  };
  const preset = looks[name];
  if (!preset) return;
  Object.assign(view, preset);
  applyAdjustments();
  showToast(`Visual ${name} aplicado`);
}

function setComparing(active) {
  view.comparing = active;
  applyAdjustments();
}

function toggleFocusMode() {
  view.focus = !view.focus;
  dialog.classList.toggle("focusMode", view.focus);
  focusMode.classList.toggle("active", view.focus);
  focusMode.querySelector("span") && (focusMode.querySelector("span").textContent = view.focus ? "Reduzir" : "Expandir");
  requestAnimationFrame(fitPreview);
}

function cycleViewerBackground() {
  stageBackgrounds.forEach(cls => imageStage.classList.remove(cls));
  view.stageBg = (view.stageBg + 1) % stageBackgrounds.length;
  imageStage.classList.add(stageBackgrounds[view.stageBg]);
  showToast(["Fundo quadriculado", "Fundo preto", "Fundo branco", "Fundo neutro"][view.stageBg]);
}

function exportAdjustedImage() {
  if (!preview.naturalWidth || !preview.naturalHeight) return;
  const normalizedRotation = ((view.rotation % 360) + 360) % 360;
  const swap = normalizedRotation === 90 || normalizedRotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? preview.naturalHeight : preview.naturalWidth;
  canvas.height = swap ? preview.naturalWidth : preview.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(normalizedRotation * Math.PI / 180);
  ctx.scale(view.flipX, view.flipY);
  ctx.filter = `brightness(${view.brightness}%) contrast(${view.contrast}%) saturate(${view.saturation}%) hue-rotate(${view.hue}deg)`;
  ctx.drawImage(preview, -preview.naturalWidth / 2, -preview.naturalHeight / 2);
  ctx.restore();
  canvas.toBlob(blob => {
    if (!blob) return showToast("Não foi possível exportar a imagem");
    const item = filteredItems[currentIndex];
    const base = fileName(item?.pathname || "captura.jpg").replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${base}-editada.png`);
    showToast("Imagem ajustada exportada");
  }, "image/png", 1);
}

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerCenter(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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
mediaType.addEventListener("change", () => {
  localStorage.setItem("airdrawAdminMediaType", mediaType.value);
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
  videoPreview.pause();
  videoPreview.removeAttribute("src");
  videoPreview.load();
  dialog.classList.remove("videoMode");
  view.focus = false;
  dialog.classList.remove("focusMode");
  resetImageAdjustments();
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
fitWidth.addEventListener("click", fitPreviewWidth);
fitHeight.addEventListener("click", fitPreviewHeight);
rotateLeft.addEventListener("click", () => { view.rotation -= 90; view.x = 0; view.y = 0; fitPreview(); });
rotateRight.addEventListener("click", () => { view.rotation += 90; view.x = 0; view.y = 0; fitPreview(); });
flipImage.addEventListener("click", () => { view.flipX *= -1; applyTransform(); });
flipVertical.addEventListener("click", () => { view.flipY *= -1; applyTransform(); });
toggleInfo.addEventListener("click", () => viewerBody.classList.toggle("showInfo"));
[brightness, contrast, saturation, hue].forEach(input => input.addEventListener("input", () => {
  view.brightness = Number(brightness.value);
  view.contrast = Number(contrast.value);
  view.saturation = Number(saturation.value);
  view.hue = Number(hue.value);
  applyAdjustments();
}));
resetAdjustments.addEventListener("click", resetImageAdjustments);
quickLookButtons.forEach(button => button.addEventListener("click", () => applyLook(button.dataset.look)));
exportEdited.addEventListener("click", exportAdjustedImage);
focusMode.addEventListener("click", toggleFocusMode);
cycleStageBg.addEventListener("click", cycleViewerBackground);
compareOriginal.addEventListener("pointerdown", event => { event.preventDefault(); setComparing(true); });
["pointerup", "pointercancel", "pointerleave"].forEach(type => compareOriginal.addEventListener(type, () => setComparing(false)));

fullscreen.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await dialog.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast("Tela cheia indisponível neste navegador");
  }
});

imageStage.addEventListener("wheel", event => {
  if (dialog.classList.contains("videoMode")) return;
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  setZoom(view.zoom * factor, event.clientX, event.clientY);
}, { passive: false });

imageStage.addEventListener("dblclick", event => {
  if (dialog.classList.contains("videoMode")) return;
  if (view.zoom < 1.5) setZoom(Math.max(2, view.zoom * 2), event.clientX, event.clientY);
  else fitPreview();
});

imageStage.addEventListener("pointerdown", event => {
  if (dialog.classList.contains("videoMode")) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  imageStage.setPointerCapture?.(event.pointerId);

  if (activePointers.size === 2) {
    const [a, b] = [...activePointers.values()];
    pinchStartDistance = pointerDistance(a, b);
    pinchStartZoom = view.zoom;
    pinchCenter = pointerCenter(a, b);
    view.panning = false;
    imageStage.classList.remove("isPanning");
    return;
  }

  if (activePointers.size === 1 && (view.zoom > 1 || Math.abs(view.rotation % 180) === 90)) {
    view.panning = true;
    view.pointerX = event.clientX;
    view.pointerY = event.clientY;
    view.startX = view.x;
    view.startY = view.y;
    imageStage.classList.add("isPanning");
  }
});

imageStage.addEventListener("pointermove", event => {
  if (dialog.classList.contains("videoMode")) return;
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activePointers.size === 2) {
    const [a, b] = [...activePointers.values()];
    const distance = pointerDistance(a, b);
    const center = pointerCenter(a, b);
    if (pinchStartDistance > 0) {
      const target = pinchStartZoom * (distance / pinchStartDistance);
      setZoom(target, center.x, center.y);
      if (pinchCenter) {
        view.x += center.x - pinchCenter.x;
        view.y += center.y - pinchCenter.y;
        pinchCenter = center;
        applyTransform();
      }
    }
    return;
  }

  if (!view.panning) return;
  view.x = view.startX + (event.clientX - view.pointerX);
  view.y = view.startY + (event.clientY - view.pointerY);
  applyTransform();
});

function stopPanning(event) {
  activePointers.delete(event.pointerId);
  imageStage.releasePointerCapture?.(event.pointerId);
  if (activePointers.size < 2) {
    pinchStartDistance = 0;
    pinchCenter = null;
  }
  if (activePointers.size === 0) {
    view.panning = false;
    imageStage.classList.remove("isPanning");
    applyTransform();
  }
}
imageStage.addEventListener("pointerup", stopPanning);
imageStage.addEventListener("pointercancel", stopPanning);

window.addEventListener("resize", () => {
  if (dialog.open && preview.src && !dialog.classList.contains("videoMode")) fitPreview();
});

document.addEventListener("keydown", event => {
  if (!dialog.open) return;
  const key = event.key.toLowerCase();
  const videoMode = dialog.classList.contains("videoMode");
  if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1); }
  else if (event.key === "ArrowRight") { event.preventDefault(); navigate(1); }
  else if (!videoMode && (event.key === "+" || event.key === "=")) { event.preventDefault(); setZoom(view.zoom * 1.2); }
  else if (!videoMode && event.key === "-") { event.preventDefault(); setZoom(view.zoom / 1.2); }
  else if (!videoMode && event.key === "0") { event.preventDefault(); fitPreview(); }
  else if (!videoMode && key === "r") { event.preventDefault(); view.rotation += 90; fitPreview(); }
  else if (key === "f") { event.preventDefault(); toggleFocusMode(); }
  else if (!videoMode && event.code === "Space") { event.preventDefault(); setComparing(true); }
  else if (key === "d") { event.preventDefault(); download.click(); }
});


document.addEventListener("keyup", event => {
  if (dialog.open && !dialog.classList.contains("videoMode") && event.code === "Space") setComparing(false);
});
