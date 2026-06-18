import React, { useState, useEffect } from "react";
import { Search, Heart, Clock, Trash2, MapPin, Star, Sparkles } from "lucide-react";

interface RecentSearchesProps {
  onSelectCity: (city: string) => void;
  currentCityName: string;
  onSelectMyLocation: () => void;
  hasLocationPermission: boolean | null;
  unit: "C" | "F";
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  onSelectCity,
  currentCityName,
  onSelectMyLocation,
  hasLocationPermission,
  unit,
}) => {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load from LocalStorage
  useEffect(() => {
    const savedRecents = localStorage.getItem("weather_recents");
    const savedFavs = localStorage.getItem("weather_favorites");
    if (savedRecents) setRecents(JSON.parse(savedRecents));
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  // Update recents list when currentCityName changes
  useEffect(() => {
    if (!currentCityName || currentCityName === "Coordinates Location" || currentCityName === "Current Location") return;
    setRecents((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== currentCityName.toLowerCase());
      const updated = [currentCityName, ...filtered].slice(0, 5);
      localStorage.setItem("weather_recents", JSON.stringify(updated));
      return updated;
    });
  }, [currentCityName]);

  const toggleFavorite = () => {
    if (!currentCityName) return;
    setFavorites((prev) => {
      let updated: string[];
      if (prev.some((item) => item.toLowerCase() === currentCityName.toLowerCase())) {
        updated = prev.filter((item) => item.toLowerCase() !== currentCityName.toLowerCase());
      } else {
        updated = [...prev, currentCityName];
      }
      localStorage.setItem("weather_favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecents([]);
    localStorage.removeItem("weather_recents");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSelectCity(query.trim());
      setQuery("");
    }
  };

  const isFavorited = favorites.some((item) => item.toLowerCase() === (currentCityName || "").toLowerCase());

  // Default suggested top locations
  const popularCities = ["New York", "London", "Tokyo", "Paris", "Sydney", "Mumbai"];

  return (
    <div className="flex flex-col gap-5 w-full bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-5 md:p-6 shadow-xl relative z-10">
      
      {/* City Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search global cities..."
          className="w-full bg-slate-100/10 dark:bg-slate-900/50 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-2xl py-3.5 pl-12 pr-4 border border-slate-200/20 focus:border-blue-500/50 dark:focus:border-blue-400/50 outline-none text-sm font-sans tracking-wide transition-all shadow-inner focus:ring-1 focus:ring-blue-500/20"
        />
        <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
        <button
          type="submit"
          className="absolute right-3 bg-blue-500/90 hover:bg-blue-600 text-white p-2 rounded-xl transition-all shadow-md active:scale-95"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* Geolocation current city detector */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-3.5 rounded-2xl border border-blue-400/10">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Your Ambient Weather</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Detect live local conditions</span>
          </div>
        </div>
        <button
          onClick={onSelectMyLocation}
          className="px-4 py-1.5 bg-blue-500 dark:bg-blue-600 text-white rounded-xl text-xs font-medium shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-600/20 transition-all hover:bg-blue-600 active:scale-95"
        >
          Locate Me
        </button>
      </div>

      {/* Current City Status & Favorite Toggle */}
      {currentCityName && (
        <div className="flex items-center justify-between bg-slate-100/10 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-200/10">
          <div className="flex items-center gap-2 max-w-[70%]">
            <Star className={`w-4 h-4 ${isFavorited ? "text-yellow-500 fill-yellow-500" : "text-slate-400"}`} />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate select-all">
              {currentCityName}
            </span>
          </div>
          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
              isFavorited
                ? "bg-rose-500/10 border-rose-500/40 text-rose-500 hover:bg-rose-500/20"
                : "border-slate-200/20 text-slate-700 dark:text-slate-300 hover:bg-slate-100/20"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-rose-500" : ""}`} />
            {isFavorited ? "Favorited" : "Favorite"}
          </button>
        </div>
      )}

      {/* Favorites Sidebar list */}
      {favorites.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            Favorite Cities
          </h4>
          <div className="flex flex-wrap gap-2">
            {favorites.map((city) => (
              <button
                key={city}
                onClick={() => onSelectCity(city)}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/15 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl text-xs font-medium cursor-pointer transition-all"
              >
                <span>{city}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recents.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Recents
            </h4>
            <button
              onClick={clearRecents}
              className="text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all p-1"
              title="Clear history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            {recents.map((city, idx) => (
              <button
                key={`${city}-${idx}`}
                onClick={() => onSelectCity(city)}
                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-100/10 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-all group"
              >
                <Clock className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                <span className="truncate flex-1">{city}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Suggestions */}
      <div className="flex flex-col gap-2 border-t border-slate-200/10 pt-4">
        <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          Popular Places
        </h4>
        <div className="grid grid-cols-2 gap-2 text-center">
          {popularCities.map((city) => (
            <button
              key={city}
              id={`popular-btn-${city.replace(/\s+/g, "-")}`}
              onClick={() => onSelectCity(city)}
              className="px-3 py-2 bg-slate-100/5 hover:bg-slate-100/15 border border-slate-200/10 hover:border-slate-300/20 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-medium transition-all"
            >
              {city}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
