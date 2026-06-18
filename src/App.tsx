import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Wind,
  Droplets,
  Eye,
  Sunrise,
  Sunset,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Compass,
  Smile,
  Activity,
  User,
  Heart,
  Thermometer,
  Gauge,
  Tornado,
  ChevronDown,
  MessageSquare,
  Send,
  HelpCircle,
  Trash2
} from "lucide-react";
import { WeatherData, AiBriefing } from "./types";
import { WeatherBackground } from "./components/WeatherBackground";
import { RecentSearches } from "./components/RecentSearches";
import { WeatherForecast } from "./components/WeatherForecast";
import { WeatherTrendsChart } from "./components/WeatherTrendsChart";
import { FlowRadarSandbox } from "./components/FlowRadarSandbox";

export default function App() {
  const [city, setCity] = useState("London");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [unit, setUnit] = useState<"C" | "F">("C");
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // AI Briefing State
  const [aiBriefing, setAiBriefing] = useState<AiBriefing | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Clear chat logs when city/weather changes
  useEffect(() => {
    if (weather) {
      setChatMessages([
        {
          role: "assistant",
          text: `Hi there! I am the Tempest AI Meteorologist. Ask me anything about ${weather.city.name}'s weather, what to wear, or how to plan your day!`
        }
      ]);
    }
  }, [weather?.city.name]);

  const handleSendQuery = async (queryText?: string) => {
    const messageToSend = (queryText || userQuery).trim();
    if (!messageToSend || !weather) return;

    // Reset user input field immediately if we used it
    if (!queryText) {
      setUserQuery("");
    }

    // Append user input
    const updatedMessages = [...chatMessages, { role: "user" as const, text: messageToSend }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: weather.city.name,
          current: weather.current,
          message: messageToSend,
          history: updatedMessages.slice(-6).map(m => ({
            role: m.role === "user" ? "user" : "model",
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Chat service offline");
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: "assistant" as const, text: data.reply }]);
    } catch (err) {
      console.error("AI Chat Error:", err);
      setChatMessages(prev => [
        ...prev,
        { role: "assistant" as const, text: "The network storms are high! Let's check my instruments and try again." }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Theme Sync on load
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Initial Fetch on Load
  useEffect(() => {
    fetchWeatherByCity(city);
  }, []);

  const fetchWeatherByCity = async (cityName: string) => {
    if (!cityName.trim()) return;
    setLoading(true);
    setError(null);
    setAiBriefing(null);
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`);
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "City not found. Please try another name.");
      }
      const data: WeatherData = await response.json();
      setWeather(data);
      setCity(data.city.name);

      // Trigger AI briefing
      fetchAiBriefing(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong fetching the weather.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    setAiBriefing(null);
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Coordinates location could not be fetched.");
      }
      const data: WeatherData = await response.json();
      setWeather(data);
      setCity(data.city.name);

      // Trigger AI briefing
      fetchAiBriefing(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to find location matching your coordinates.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByCoords(latitude, longitude);
      },
      (geoErr) => {
        console.error("Geolocation failed:", geoErr);
        setError("Location request denied. Type your city manually into the sidebar!");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const fetchAiBriefing = async (weatherData: WeatherData) => {
    setAiLoading(true);
    try {
      const response = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: weatherData.city.name,
          current: weatherData.current,
          daily: weatherData.daily,
        }),
      });
      if (response.ok) {
        const briefingData: AiBriefing = await response.json();
        setAiBriefing(briefingData);
      }
    } catch (aiErr) {
      console.error("AI briefing fetch error:", aiErr);
    } finally {
      setAiLoading(false);
    }
  };

  const convertTemp = (tempC: number) => {
    if (unit === "F") {
      return Math.round((tempC * 9) / 5 + 32);
    }
    return Math.round(tempC);
  };

  // AQI Level Descriptions
  const getAqiDescription = (aqi: number) => {
    switch (aqi) {
      case 1:
        return { label: "Excellent (Good)", color: "text-emerald-500 bg-emerald-500/10", border: "border-emerald-500/30" };
      case 2:
        return { label: "Fair (Moderate)", color: "text-yellow-500 bg-yellow-500/10", border: "border-yellow-500/30" };
      case 3:
        return { label: "Moderate (Sensitive Groups)", color: "text-orange-500 bg-orange-500/10", border: "border-orange-500/30" };
      case 4:
        return { label: "Poor (Unhealthy)", color: "text-pink-500 bg-pink-500/10", border: "border-pink-500/30" };
      case 5:
        return { label: "Very Poor (Hazardous)", color: "text-rose-500 bg-rose-500/10", border: "border-rose-500/30" };
      default:
        return { label: "Unknown AQI", color: "text-slate-400 bg-slate-400/10", border: "border-slate-400/30" };
    }
  };

  const aqiInfo = weather ? getAqiDescription(weather.current.aqi) : null;

  return (
    <div className="min-h-screen font-sans bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500 relative pb-12 overflow-x-hidden">
      
      {/* Background Ambience Layer */}
      {weather && <WeatherBackground code={weather.current.code} />}

      {/* Global Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/75 backdrop-blur-xl border-b border-slate-200/10 py-4 px-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto rounded-b-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-display bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
              Tempest
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Atmospheric Portal</p>
          </div>
        </div>

        {/* Global Action Toggles */}
        <div className="flex items-center gap-3">
          {/* C/F Switch */}
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/10">
            <button
              onClick={() => setUnit("C")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${
                unit === "C"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              °C
            </button>
            <button
              onClick={() => setUnit("F")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${
                unit === "F"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              °F
            </button>
          </div>

          {/* Light/Dark Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-250 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-inner border border-slate-200/5"
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400 animate-pulse" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        
        {/* Error Notification Alert */}
        {error && (
          <div className="mb-6 bg-rose-500/15 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-center text-rose-600 dark:text-rose-450 text-sm shadow-lg max-w-4xl mx-auto">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Weather system notice: </span>
              {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold border border-rose-500/10 px-2 rounded hover:bg-rose-500/10 transition-all"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel / Sidebar controller (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <RecentSearches
              onSelectCity={fetchWeatherByCity}
              currentCityName={weather ? weather.city.name : ""}
              onSelectMyLocation={handleGetCurrentLocation}
              hasLocationPermission={true}
              unit={unit}
            />

            {/* Optional details box - meteorological context */}
            <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden z-10 hidden lg:flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Smile className="w-3.5 h-3.5 text-sky-400" />
                Live Feed Source
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-450 leading-relaxed font-sans">
                Unified ambient integration via {weather?.source || "Global Meteo Service"}. Utilizing precise timezone offset mapping to accurately represent target coordinates without reliance on local device offsets.
              </p>
              {weather && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/5 text-2xs font-mono text-slate-500">
                  <div className="flex justify-between">
                    <span>Coordinates & Lat:</span>
                    <span>{weather.city.lat.toFixed(4)}°N</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordinates & Lon:</span>
                    <span>{weather.city.lon.toFixed(4)}°E</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TimeZone Offset:</span>
                    <span>{weather.city.timezone}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right principal panel (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Loading Cover Spinner overlay or prompt */}
            {loading ? (
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-16 flex flex-col items-center justify-center gap-4 text-center border border-slate-200/10 min-h-[400px]">
                <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <div>
                  <h3 className="text-lg font-bold">Scanning Weather Stream</h3>
                  <p className="text-xs text-slate-400">Tuning radars, capturing live metrics...</p>
                </div>
              </div>
            ) : weather ? (
              <>
                {/* Main Instant Radar & Info Card */}
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 flex flex-col justify-between overflow-hidden gap-6">
                  
                  {/* Glassmorphic background highlight glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

                  {/* Header Row: City, country, and local current date */}
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-1">
                        <MapPin className="w-3.5 h-3.5 animate-bounce" />
                        <span>{weather.city.country}</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold font-display leading-tight flex items-baseline gap-2">
                        <span>{weather.city.name}</span>
                      </h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-indigo-200/70 font-medium">Currently Selected</p>
                      <p className="text-xs font-mono text-indigo-300 font-semibold mt-1">
                        {weather.city.timezone}
                      </p>
                    </div>
                  </div>

                  {/* Temperature & Large Visual Core section */}
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 py-4 z-10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl md:text-8xl font-black font-display tracking-tighter text-slate-50">
                        {convertTemp(weather.current.temp)}
                      </span>
                      <span className="text-3xl md:text-4xl font-semibold text-sky-300">
                        °{unit}
                      </span>
                    </div>

                    {/* Meteorological State summary card */}
                    <div className="flex flex-col items-center md:items-end text-center md:text-right">
                      {weather.current.icon && (
                        <img
                          src={`https://openweathermap.org/img/wn/${weather.current.icon}@4x.png`}
                          alt="Weather Icon"
                          className="w-24 h-24 drop-shadow-[0_4px_10px_rgba(59,130,246,0.3)] animate-bounce"
                          style={{ animationDuration: "4s" }}
                          onError={(e) => {
                            // Suppress broken icons with a simple fallback container block
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <p className="text-xl font-bold tracking-tight text-white capitalize mt-1">
                        {weather.current.description}
                      </p>
                      <p className="text-xs text-indigo-200/80 mt-1 font-mono">
                        Feels like {convertTemp(weather.current.feelsLike)}°{unit}
                      </p>
                    </div>
                  </div>

                  {/* Highlights Bar Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100/10 z-10">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2.5 rounded-2xl">
                        <Droplets className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-200/60 font-medium">Humidity</p>
                        <p className="text-sm font-bold">{weather.current.humidity}%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2.5 rounded-2xl">
                        <Wind className="w-5 h-5 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-200/60 font-medium">Wind Speed</p>
                        <p className="text-sm font-bold">{weather.current.windSpeed} km/h</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2.5 rounded-2xl">
                        <Compass className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-200/60 font-medium">Wind Dir</p>
                        <p className="text-sm font-bold">{weather.current.windDirection}°</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2.5 rounded-2xl">
                        <Eye className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-200/60 font-medium">Visibility</p>
                        <p className="text-sm font-bold">{weather.current.visibility.toFixed(1)} km</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* AI Briefing Segment - Powered by Gemini */}
                <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-blue-500/20 dark:border-blue-400/20 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden z-10 flex flex-col gap-4">
                  {/* Subtle decorative glow in top right */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <h3 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent font-display tracking-tight flex items-center gap-1.5">
                        Gemini AI Planner Insights
                      </h3>
                    </div>
                    {aiLoading && (
                      <div className="flex items-center gap-1 text-2xs text-blue-500">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Generating briefing...</span>
                      </div>
                    )}
                  </div>

                  {aiBriefing ? (
                    <div className="flex flex-col gap-4">
                      {/* Interactive narrative text block */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-100/5 p-3 rounded-2xl border border-slate-200/5">
                        {aiBriefing.briefing}
                      </p>

                      {/* Daily Activities Plan suggestion list */}
                      <div>
                        <h4 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Tailored Outdoor & Indoor Activities For Today
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiBriefing.activities?.map((act, index) => (
                            <div
                              key={index}
                              className="bg-slate-100/5 dark:bg-slate-900/20 border border-slate-200/5 hover:border-slate-300/20 p-3 rounded-2xl flex flex-col gap-1 transition-all hover:translate-x-[2px] leading-relaxed"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                                  {act.name}
                                </span>
                                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  act.type === "outdoor" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                                }`}>
                                  {act.type} • {act.rating}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
                                {act.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      Our meteorological models are calculating the ideal custom briefing and activities list...
                    </div>
                  )}
                </div>

                {/* Additional Meteorological Stations: Sun positions, air pollutants, pressure, uvIndex */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Sunrise & Sunset Widget */}
                  <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                      <Sunrise className="w-4 h-4 text-amber-400" />
                      Daylight Cycle
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3.5 bg-slate-100/5 p-3 rounded-2xl border border-slate-250/5">
                        <Sunrise className="w-7 h-7 text-yellow-500 animate-pulse bg-yellow-500/15 p-1 rounded-xl" />
                        <div>
                          <p className="text-2xs text-slate-400">Sunrise Time</p>
                          <p className="text-sm font-bold font-mono">{weather.current.sunrise}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 bg-slate-100/5 p-3 rounded-2xl border border-slate-250/5">
                        <Sunset className="w-7 h-7 text-indigo-400 bg-indigo-500/15 p-1 rounded-xl" />
                        <div>
                          <p className="text-2xs text-slate-400">Sunset Time</p>
                          <p className="text-sm font-bold font-mono">{weather.current.sunset}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Air Quality Index gauge */}
                  <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Air Quality Index
                    </h3>
                    {aqiInfo && (
                      <div className="flex flex-col gap-3">
                        <div className={`p-3 rounded-2xl border text-center font-bold text-xs ${aqiInfo.color} ${aqiInfo.border}`}>
                          {aqiInfo.label}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-2xs font-mono text-slate-500">
                          <div className="bg-slate-100/5 p-2 rounded-xl flex flex-col">
                            <span>PM 2.5:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{weather.current.pm25.toFixed(1)} µg/m³</span>
                          </div>
                          <div className="bg-slate-100/5 p-2 rounded-xl flex flex-col">
                            <span>PM 10:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{weather.current.pm10.toFixed(1)} µg/m³</span>
                          </div>
                          <div className="bg-slate-100/5 p-2 rounded-xl flex flex-col">
                            <span>Ozone (O₃):</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{weather.current.o3.toFixed(1)} ppb</span>
                          </div>
                          <div className="bg-slate-100/5 p-2 rounded-xl flex flex-col">
                            <span>NO₂:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{weather.current.no2.toFixed(1)} ppb</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Pressure & UV Index */}
                  <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                      <Gauge className="w-4 h-4 text-yellow-500" />
                      Atmospherics
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center bg-slate-100/5 p-3 rounded-2xl border border-slate-250/5">
                        <div className="flex items-center gap-2">
                          <Tornado className="w-5 h-5 text-indigo-400" />
                          <span className="text-xs">Barometer</span>
                        </div>
                        <span className="text-sm font-bold font-mono">{weather.current.pressure} hPa</span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-100/5 p-3 rounded-2xl border border-slate-250/5">
                        <div className="flex items-center gap-2">
                          <Sun className="w-5 h-5 text-orange-400" />
                          <span className="text-xs">UV Index</span>
                        </div>
                        <span className="text-sm font-bold font-mono">
                          {weather.current.uvIndex > 0 ? weather.current.uvIndex : "Low (0)"}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Detailed Forecast segments: 5-Day & Hourly Cards */}
                <WeatherForecast hourly={weather.hourly} daily={weather.daily} unit={unit} />

                {/* Dynamic Meteorological Labs Grid (Trends & Canvas Fluid Sandbox) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full z-10 relative">
                  <WeatherTrendsChart hourly={weather.hourly} unit={unit} />
                  <FlowRadarSandbox 
                    temp={weather.current.temp} 
                    windSpeed={weather.current.windSpeed} 
                    windDirection={weather.current.windDirection} 
                    humidity={weather.current.humidity}
                    cityName={weather.city.name}
                  />
                </div>

                {/* Ask Tempest AI Chatbot Companion */}
                <div id="ai-chat-card" className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/10 dark:border-slate-800/20 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden z-10 flex flex-col gap-4">
                  <div className="absolute top-0 left-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent font-display tracking-tight flex items-center gap-2">
                        Ask Tempest AI Meteorologist
                        <span className="text-[10px] uppercase tracking-widest font-normal text-slate-400 bg-slate-100/5 px-2 py-0.5 rounded-full border border-slate-200/5">
                          Interactive Q&A
                        </span>
                      </h3>
                    </div>

                    <button
                      onClick={() => setChatMessages([
                        {
                          role: "assistant",
                          text: `Hi again! Ask me anything about ${weather.city.name}'s current weather trends or get tailored recommendations.`
                        }
                      ])}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-100/5 hover:bg-slate-100/10 px-2 py-1 rounded-xl transition-all border border-slate-200/5"
                      title="Clear Conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </div>

                  {/* Suggestion tags */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "👜 What should I pack?", query: `What should I pack or wear today in ${weather.city.name} based on the weather?` },
                      { label: "🏃 Is it good for an outdoor run?", query: `Is the current weather in ${weather.city.name} suitable for an outdoor run?` },
                      { label: "💡 Fun atmospheric fact!", query: `Tell me a fun, short meteorological fact related to the current weather condition: ${weather.current.description}.` },
                      { label: "📷 Photography tips", query: `Provide quick tips for taking scenic photos in ${weather.city.name} in this weather.` }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendQuery(item.query)}
                        disabled={isChatLoading}
                        className="text-2xs bg-slate-150/10 hover:bg-slate-200/15 dark:bg-slate-900/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200/10 transition-all cursor-pointer select-none truncate max-w-full"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Messages Feed */}
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1 pb-1">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 max-w-[85%] ${
                          msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                        }`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 flex items-center justify-center ${
                          msg.role === "user" ? "bg-indigo-500/20 text-indigo-400" : "bg-blue-500/20 text-blue-400"
                        } w-7 h-7 mt-0.5 text-xs font-bold`}>
                          {msg.role === "user" ? "U" : "T"}
                        </div>
                        <div className={`text-xs p-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-indigo-500/10 text-slate-800 dark:text-slate-200 rounded-tr-none border border-indigo-500/20"
                            : "bg-slate-100/5 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-200/5"
                        } leading-relaxed`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-3 self-start items-center">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 w-7 h-7 flex items-center justify-center text-xs">
                          T
                        </div>
                        <div className="text-xs bg-slate-100/5 text-slate-400 pr-4 pl-3 py-3 rounded-2xl rounded-tl-none border border-slate-200/5 flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span>Barometers calibrating...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendQuery();
                    }}
                    className="flex gap-2 items-center bg-white/5 dark:bg-slate-900/55 rounded-2xl p-1.5 border border-slate-200/10"
                  >
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-xs px-3 text-slate-800 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-500"
                      placeholder="Ask about attire, photo tips, travel, or trends..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      disabled={isChatLoading}
                    />
                    <button
                      type="submit"
                      disabled={isChatLoading || !userQuery.trim()}
                      className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-16 text-center shadow-xl flex flex-col items-center justify-center gap-4 text-slate-400 z-10 min-h-[400px]">
                <Compass className="w-16 h-16 text-blue-500 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Begin Weather Query</h3>
                  <p className="text-xs max-w-sm mx-auto leading-relaxed mt-1 text-slate-500">
                    Use our live search console to select any global city, or tap "Locate Me" to query coordinates directly using HTML5 Geolocation.
                  </p>
                </div>
                <button
                  onClick={handleGetCurrentLocation}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl text-xs transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer"
                >
                  Locate Me Instantly
                </button>
              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}
