const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Depositing rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Slight rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Slight snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Violent rain showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm w/ hail", "⛈️"],
  99: ["Thunderstorm w/ hail", "⛈️"],
};

const statusEl = document.getElementById("status");
const currentSection = document.getElementById("current-weather");
const forecastSection = document.getElementById("forecast");
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const locateBtn = document.getElementById("locate-btn");

function describeCode(code) {
  return WEATHER_CODES[code] || ["Unknown", "❔"];
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("hidden", !message);
  statusEl.style.color = isError ? "#ff8a8a" : "";
}

function showResults() {
  currentSection.classList.remove("hidden");
  forecastSection.classList.remove("hidden");
}

function hideResults() {
  currentSection.classList.add("hidden");
  forecastSection.classList.add("hidden");
}

async function geocodeCity(name) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No location found for "${name}"`);
  }
  const { latitude, longitude, name: resolvedName, admin1, country } = data.results[0];
  const label = [resolvedName, admin1, country].filter(Boolean).join(", ");
  return { latitude, longitude, label };
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "5",
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Weather request failed");
  return res.json();
}

function renderCurrent(label, data) {
  const { current, current_units } = data;
  const [desc, icon] = describeCode(current.weather_code);

  document.getElementById("location-name").textContent = label;
  document.getElementById("location-time").textContent = new Date(current.time).toLocaleString(undefined, {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  document.getElementById("current-icon").textContent = icon;
  document.getElementById("current-temp").textContent = `${Math.round(current.temperature_2m)}${current_units.temperature_2m}`;
  document.getElementById("current-desc").textContent = desc;
  document.getElementById("feels-like").textContent = `${Math.round(current.apparent_temperature)}${current_units.apparent_temperature}`;
  document.getElementById("humidity").textContent = `${current.relative_humidity_2m}${current_units.relative_humidity_2m}`;
  document.getElementById("wind").textContent = `${Math.round(current.wind_speed_10m)} ${current_units.wind_speed_10m}`;
  document.getElementById("precip").textContent = `${current.precipitation} ${current_units.precipitation}`;
}

function renderForecast(data) {
  const { daily, daily_units } = data;
  const container = document.getElementById("forecast-days");
  container.innerHTML = "";

  daily.time.forEach((dateStr, i) => {
    const [desc, icon] = describeCode(daily.weather_code[i]);
    const dayName = new Date(dateStr).toLocaleDateString(undefined, { weekday: "short" });

    const el = document.createElement("div");
    el.className = "forecast-day";
    el.title = desc;
    el.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${icon}</div>
      <div class="day-temps">
        <span class="high">${Math.round(daily.temperature_2m_max[i])}°</span>
        <span class="low">${Math.round(daily.temperature_2m_min[i])}${daily_units.temperature_2m_min}</span>
      </div>
    `;
    container.appendChild(el);
  });
}

async function loadWeatherForCity(name) {
  hideResults();
  setStatus(`Searching for "${name}"...`);
  try {
    const { latitude, longitude, label } = await geocodeCity(name);
    setStatus("Loading weather...");
    const data = await fetchWeather(latitude, longitude);
    renderCurrent(label, data);
    renderForecast(data);
    setStatus("");
    showResults();
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
}

async function loadWeatherForCoords(latitude, longitude, label) {
  hideResults();
  setStatus("Loading weather...");
  try {
    const data = await fetchWeather(latitude, longitude);
    renderCurrent(label, data);
    renderForecast(data);
    setStatus("");
    showResults();
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = cityInput.value.trim();
  if (name) loadWeatherForCity(name);
});

locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by your browser.", true);
    return;
  }
  setStatus("Finding your location...");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      loadWeatherForCoords(latitude, longitude, "Your location");
    },
    () => setStatus("Unable to retrieve your location.", true)
  );
});
