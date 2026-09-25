# ☕ Cafe Finder

Find cafes near you on a map, save your favorites, and get directions. Plain HTML, CSS and JavaScript, with no build step.

## Features
- Uses your location, or searches any city or neighborhood
- Radius filter (500 m to 5 km); sort by distance, rating or name
- **Live Google Maps data** when you add an API key: ratings, review counts, today's hours and an **Open now** filter
- Falls back to free **OpenStreetMap** data when there's no key
- ♥ Favorites are saved in your browser, with a "Favorites only" filter
- Directions link for every cafe; works on phones and in dark mode

## Run it
Browsers only allow location access and ES modules on a real server, so don't open the file directly:

```bash
cd projects/cafe-finder
python3 -m http.server 8000
# open http://localhost:8000
```

## Use real-time Google Maps data
1. In the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis), create a project and enable **Maps JavaScript API** and **Places API (New)**.
2. Create an API key. Under key restrictions, limit it to your site (for example `http://localhost:8000/*`).
3. Paste the key into `config.js` as `GOOGLE_MAPS_API_KEY`.

Google Maps keys are visible to anyone who opens the page, so the website restriction is what protects your key. Only commit a key that has that restriction.

## Files
- `index.html`: page layout
- `style.css`: styles, plus the dark-mode and mobile layouts
- `app.js`: search, filters, favorites and rendering
- `providers.js`: the Google Maps and OpenStreetMap data and map adapters, which share one interface
- `config.js`: your API key and the default location
