// Data + map providers. Each provider exposes the same small interface so the
// app doesn't care whether data comes from Google Maps or OpenStreetMap:
//
//   provider.name                       -> label shown in the UI
//   provider.hasRatings / hasOpenNow    -> which filters/sorts make sense
//   provider.createMap(el, center)      -> map adapter (see below)
//   provider.geocode(text)              -> { lat, lng, label } | null
//   provider.searchCafes(center, radius)-> Cafe[]
//
// Cafe: { id, name, lat, lng, address, rating, ratingCount, openNow,
//         hoursToday, url }  (unknown values are null)
//
// Map adapter: { setCenter(center), setUser(center), setCafes(cafes, onSelect),
//                fit(points), focus(id) }

// ---------------------------------------------------------------- Google Maps

function loadGoogleMaps(key) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  return new Promise((resolve, reject) => {
    window.__cafeFinderGoogleReady = resolve;
    const s = document.createElement("script");
    s.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(key) +
      "&v=weekly&loading=async&callback=__cafeFinderGoogleReady";
    s.async = true;
    s.onerror = () => reject(new Error("Couldn't load Google Maps. Check your API key."));
    document.head.appendChild(s);
  });
}

export async function googleProvider(key) {
  await loadGoogleMaps(key);
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places");
  const { Geocoder } = await google.maps.importLibrary("geocoding");
  const geocoder = new Geocoder();

  return {
    name: "Google Maps (live)",
    hasRatings: true,
    hasOpenNow: true,

    createMap(el, center) {
      const map = new Map(el, {
        center,
        zoom: 15,
        mapId: "DEMO_MAP_ID",
        disableDefaultUI: true,
        zoomControl: true,
      });
      let user = null;
      let markers = new globalThis.Map();
      return {
        setCenter(c) {
          map.panTo(c);
        },
        setUser(c) {
          if (user) user.map = null;
          const dot = document.createElement("div");
          dot.className = "user-dot";
          user = new AdvancedMarkerElement({ map, position: c, content: dot, title: "You are here" });
        },
        setCafes(cafes, onSelect) {
          markers.forEach((m) => (m.map = null));
          markers = new globalThis.Map();
          for (const cafe of cafes) {
            const pin = new PinElement({ glyph: "☕", background: "#b5651d", borderColor: "#7a3f10" });
            const m = new AdvancedMarkerElement({
              map,
              position: { lat: cafe.lat, lng: cafe.lng },
              content: pin.element,
              title: cafe.name,
            });
            m.addListener("click", () => onSelect(cafe.id));
            markers.set(cafe.id, m);
          }
        },
        fit(points) {
          if (points.length < 2) return;
          const bounds = new google.maps.LatLngBounds();
          points.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 48);
        },
        focus(id) {
          const m = markers.get(id);
          if (m) {
            map.panTo(m.position);
            map.setZoom(Math.max(map.getZoom(), 16));
          }
        },
      };
    },

    async geocode(text) {
      const { results } = await geocoder.geocode({ address: text });
      if (!results.length) return null;
      const loc = results[0].geometry.location;
      return { lat: loc.lat(), lng: loc.lng(), label: results[0].formatted_address };
    },

    async searchCafes(center, radius) {
      const { places } = await Place.searchNearby({
        fields: [
          "id",
          "displayName",
          "location",
          "formattedAddress",
          "rating",
          "userRatingCount",
          "regularOpeningHours",
          "utcOffsetMinutes",
          "googleMapsURI",
          "businessStatus",
        ],
        locationRestriction: { center, radius },
        includedTypes: ["cafe", "coffee_shop"],
        maxResultCount: 20,
        rankPreference: SearchNearbyRankPreference.DISTANCE,
      });
      const todayIdx = (new Date().getDay() + 6) % 7; // Google lists Monday first
      return Promise.all(
        places
          .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
          .map(async (p) => {
            let openNow = null;
            try {
              openNow = (await p.isOpen()) ?? null;
            } catch {
              openNow = null;
            }
            const hours = p.regularOpeningHours?.weekdayDescriptions?.[todayIdx] ?? null;
            return {
              id: p.id,
              name: p.displayName,
              lat: p.location.lat(),
              lng: p.location.lng(),
              address: p.formattedAddress ?? "",
              rating: p.rating ?? null,
              ratingCount: p.userRatingCount ?? null,
              openNow,
              hoursToday: hours ? hours.replace(/^[^:]+:\s*/, "") : null,
              url: p.googleMapsURI ?? null,
            };
          }),
      );
    },
  };
}

// -------------------------------------------------------------- OpenStreetMap

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function osmAddress(tags) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return [street, tags["addr:city"]].filter(Boolean).join(", ");
}

export function osmProvider() {
  return {
    name: "OpenStreetMap",
    hasRatings: false,
    hasOpenNow: false,

    createMap(el, center) {
      const map = L.map(el, { zoomControl: true }).setView([center.lat, center.lng], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const cafeIcon = L.divIcon({ className: "cafe-pin", html: "☕", iconSize: [32, 32], iconAnchor: [16, 16] });
      let user = null;
      let layer = L.layerGroup().addTo(map);
      let markers = new Map();
      return {
        setCenter(c) {
          map.setView([c.lat, c.lng], map.getZoom());
        },
        setUser(c) {
          if (user) user.remove();
          user = L.circleMarker([c.lat, c.lng], {
            radius: 8,
            color: "#fff",
            weight: 3,
            fillColor: "#2a78d6",
            fillOpacity: 1,
          })
            .bindTooltip("You are here")
            .addTo(map);
        },
        setCafes(cafes, onSelect) {
          layer.clearLayers();
          markers = new Map();
          for (const cafe of cafes) {
            const m = L.marker([cafe.lat, cafe.lng], { icon: cafeIcon, title: cafe.name })
              .on("click", () => onSelect(cafe.id))
              .addTo(layer);
            markers.set(cafe.id, m);
          }
        },
        fit(points) {
          if (points.length < 2) return;
          map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 17 });
        },
        focus(id) {
          const m = markers.get(id);
          if (m) map.setView(m.getLatLng(), Math.max(map.getZoom(), 16));
        },
      };
    },

    async geocode(text) {
      const res = await fetch(`${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error(`Location search failed (${res.status})`);
      const [hit] = await res.json();
      return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
    },

    async searchCafes(center, radius) {
      const around = `(around:${radius},${center.lat},${center.lng})`;
      const query = `[out:json][timeout:25];(node["amenity"="cafe"]${around};way["amenity"="cafe"]${around};);out center tags 80;`;
      const res = await fetch(OVERPASS_URL, { method: "POST", body: "data=" + encodeURIComponent(query) });
      if (!res.ok) throw new Error(`Cafe search failed (${res.status}) - try again in a moment`);
      const { elements } = await res.json();
      return elements
        .filter((e) => e.tags?.name)
        .map((e) => ({
          id: `${e.type}/${e.id}`,
          name: e.tags.name,
          lat: e.lat ?? e.center.lat,
          lng: e.lon ?? e.center.lon,
          address: osmAddress(e.tags),
          rating: null,
          ratingCount: null,
          openNow: null,
          hoursToday: e.tags.opening_hours ?? null,
          url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
        }));
    },
  };
}
