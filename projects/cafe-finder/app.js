import { googleProvider, osmProvider } from "./providers.js";

const config = window.CAFE_FINDER_CONFIG ?? {};
const $ = (id) => document.getElementById(id);
const els = {
  form: $("search-form"),
  input: $("search-input"),
  locate: $("locate-btn"),
  radius: $("radius"),
  sort: $("sort"),
  openNow: $("open-now"),
  favoritesOnly: $("favorites-only"),
  status: $("status"),
  results: $("results"),
  source: $("source"),
};

const state = {
  provider: null,
  map: null,
  center: null,
  cafes: [],
  selectedId: null,
  favorites: loadFavorites(),
};

// ---------------------------------------------------------------- favorites

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem("cafe-finder:favorites") ?? "[]"));
  } catch {
    return new Set();
  }
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  try {
    localStorage.setItem("cafe-finder:favorites", JSON.stringify([...state.favorites]));
  } catch {
    /* storage unavailable (private mode) - favorites last for this visit only */
  }
  render();
}

// ---------------------------------------------------------------- helpers

function distanceMeters(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function formatDistance(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle("error", isError);
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    // The browser's own timeout doesn't start until the user answers the
    // permission prompt, so fall back if they ignore it.
    setTimeout(() => reject(new Error("Location timed out")), 12000);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, label: "your location" }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

// ---------------------------------------------------------------- rendering

function visibleCafes() {
  let list = state.cafes.map((c) => ({ ...c, distance: distanceMeters(state.center, c) }));
  if (els.openNow.checked) list = list.filter((c) => c.openNow === true);
  if (els.favoritesOnly.checked) list = list.filter((c) => state.favorites.has(c.id));
  const sort = els.sort.value;
  list.sort((a, b) => {
    if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1) || a.distance - b.distance;
    if (sort === "name") return a.name.localeCompare(b.name);
    return a.distance - b.distance;
  });
  return list;
}

function cafeCard(c) {
  const fav = state.favorites.has(c.id);
  const rating =
    c.rating != null
      ? `<span class="rating">★ ${c.rating.toFixed(1)}<small>${c.ratingCount ? ` (${c.ratingCount.toLocaleString()})` : ""}</small></span>`
      : "";
  const open =
    c.openNow === true
      ? `<span class="badge open">Open now</span>`
      : c.openNow === false
        ? `<span class="badge closed">Closed</span>`
        : "";
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
  return `
    <li class="card${c.id === state.selectedId ? " selected" : ""}" data-id="${escapeHtml(c.id)}" tabindex="0">
      <div class="card-head">
        <h3>${escapeHtml(c.name)}</h3>
        <button class="fav${fav ? " on" : ""}" data-fav="${escapeHtml(c.id)}" aria-pressed="${fav}"
          aria-label="${fav ? "Remove from" : "Add to"} favorites">${fav ? "♥" : "♡"}</button>
      </div>
      <div class="meta">
        <span>${formatDistance(c.distance)}</span>${rating}${open}
      </div>
      ${c.address ? `<p class="addr">${escapeHtml(c.address)}</p>` : ""}
      ${c.hoursToday ? `<p class="hours">🕒 ${escapeHtml(c.hoursToday)}</p>` : ""}
      <div class="links">
        <a href="${directions}" target="_blank" rel="noopener">Directions</a>
        ${c.url ? `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">Details</a>` : ""}
      </div>
    </li>`;
}

function render() {
  const list = visibleCafes();
  els.results.innerHTML = list.map(cafeCard).join("");
  state.map.setCafes(list, select);
  if (state.cafes.length) {
    setStatus(
      list.length
        ? `${list.length} cafe${list.length === 1 ? "" : "s"} near ${state.center.label}`
        : "No cafes match these filters.",
    );
  }
}

function select(id) {
  state.selectedId = id;
  state.map.focus(id);
  render();
  els.results.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// ---------------------------------------------------------------- searching

async function searchAround(center) {
  state.center = center;
  state.selectedId = null;
  state.map.setCenter(center);
  state.map.setUser(center);
  setStatus(`Searching for cafes near ${center.label}…`);
  try {
    state.cafes = await state.provider.searchCafes(center, Number(els.radius.value));
    if (!state.cafes.length) setStatus("No cafes found here - try a bigger radius.");
    render();
    state.map.fit([center, ...state.cafes]);
  } catch (err) {
    setStatus(err.message || "Something went wrong searching for cafes.", true);
  }
}

async function useMyLocation() {
  setStatus("Getting your location…");
  try {
    await searchAround(await getPosition());
  } catch {
    const fallback = config.DEFAULT_CENTER;
    setStatus(`Couldn't get your location - showing ${fallback.label}.`);
    await searchAround(fallback);
  }
}

// ---------------------------------------------------------------- startup

async function init() {
  const key = (config.GOOGLE_MAPS_API_KEY ?? "").trim();
  try {
    state.provider = key ? await googleProvider(key) : osmProvider();
  } catch (err) {
    console.warn(err);
    state.provider = osmProvider();
    setStatus("Google Maps failed to load - using OpenStreetMap instead.", true);
  }

  if (!state.provider.hasRatings) els.sort.querySelector('[value="rating"]').remove();
  if (!state.provider.hasOpenNow) {
    els.openNow.disabled = true;
    els.openNow.parentElement.title = "Open-now status needs Google Maps data - add an API key in config.js";
  }
  els.source.textContent = `Data: ${state.provider.name}`;

  const start = config.DEFAULT_CENTER;
  state.center = start;
  state.map = state.provider.createMap(document.getElementById("map"), start);

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text) return;
    setStatus(`Looking up “${text}”…`);
    try {
      const place = await state.provider.geocode(text);
      if (!place) return setStatus(`Couldn't find “${text}”.`, true);
      await searchAround(place);
    } catch (err) {
      setStatus(err.message || "Location search failed.", true);
    }
  });
  els.locate.addEventListener("click", useMyLocation);
  els.radius.addEventListener("change", () => searchAround(state.center));
  for (const el of [els.sort, els.openNow, els.favoritesOnly]) el.addEventListener("change", render);

  els.results.addEventListener("click", (e) => {
    const favId = e.target.closest("[data-fav]")?.dataset.fav;
    if (favId) return toggleFavorite(favId);
    if (e.target.closest("a")) return;
    const card = e.target.closest(".card");
    if (card) select(card.dataset.id);
  });
  els.results.addEventListener("keydown", (e) => {
    const card = e.target.closest(".card");
    if (card && e.key === "Enter") select(card.dataset.id);
  });

  await useMyLocation();
}

init();
