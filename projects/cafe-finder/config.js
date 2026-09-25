// Cafe Finder settings.
//
// GOOGLE_MAPS_API_KEY: paste a Google Maps Platform key (with "Maps JavaScript API"
// and "Places API (New)" enabled) to get live Google Maps data: ratings, review
// counts, opening hours and open-now status.
//
// Leave it empty to use free OpenStreetMap data instead (no key needed, but no
// ratings, and hours only where OSM volunteers have entered them).
window.CAFE_FINDER_CONFIG = {
  GOOGLE_MAPS_API_KEY: "",
  // Used when the browser can't share your location.
  DEFAULT_CENTER: { lat: 40.7128, lng: -74.006, label: "New York, NY" },
};
