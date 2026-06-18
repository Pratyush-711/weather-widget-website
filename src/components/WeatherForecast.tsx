import React from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, CloudFog, CloudDrizzle, Navigation, Eye, Thermometer } from "lucide-react";
import { DailyWeather, HourlyWeather } from "../types";

interface WeatherForecastProps {
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  unit: "C" | "F";
}

export const WeatherForecast: React.FC<WeatherForecastProps> = ({ hourly, daily, unit }) => {
  const convertTemp = (tempC: number) => {
    if (unit === "F") {
      return Math.round((tempC * 9) / 5 + 32);
    }
    return Math.round(tempC);
  };

  const getWeatherIcon = (code: string, size = 6) => {
    const cls = `w-${size} h-${size} `;
    switch (code) {
      case "sunny":
        return <Sun className={`${cls} text-yellow-500`} />;
      case "cloudy":
        return <Cloud className={`${cls} text-slate-400`} />;
      case "rainy":
        return <CloudRain className={`${cls} text-blue-400`} />;
      case "snowy":
        return <CloudSnow className={`${cls} text-blue-200`} />;
      case "storm":
        return <CloudLightning className={`${cls} text-yellow-600 dark:text-yellow-400`} />;
      case "misty":
        return <CloudFog className={`${cls} text-slate-300 dark:text-slate-400`} />;
      default:
        return <Cloud className={`${cls} text-slate-400`} />;
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    // Adjust if date parsing results in off-day
    const options: Intl.DateTimeFormatOptions = { weekday: "long" };
    return date.toLocaleDateString("en-US", options);
  };

  const formatHourString = (timeStr: string) => {
    try {
      const parts = timeStr.split(" ");
      const timePart = parts[1] || parts[0];
      const hourPart = parseInt(timePart.split(":")[0]);
      const ampm = hourPart >= 12 ? "PM" : "AM";
      const displayHour = hourPart % 12 === 0 ? 12 : hourPart % 12;
      return `${displayHour} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Find lowest and highest temp in 5-day forecast to calibrate range bar
  const allMaxs = daily.map((d) => d.tempMax);
  const allMins = daily.map((d) => d.tempMin);
  const globalMax = Math.max(...allMaxs, 30);
  const globalMin = Math.min(...allMins, 0);
  const tempSpan = globalMax - globalMin || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full z-10 relative">
      
      {/* 24-Hour Forecast cards (6 columns) */}
      <div className="lg:col-span-6 flex flex-col gap-4 bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-5 md:p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-orange-400" />
            24-Hour Forecast
          </h3>
          <span className="text-2xs text-slate-400 bg-slate-100/10 px-2 py-1 rounded">Next 24 Hrs</span>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-3 snap-x scrollbar-thin">
          {hourly.map((item, idx) => (
            <div
              key={`${item.time}-${idx}`}
              className="flex flex-col items-center justify-between gap-3 text-center min-w-[76px] bg-slate-100/5 dark:bg-slate-900/30 border border-slate-200/5 hover:border-slate-300/20 rounded-2xl py-4 px-3 hover:translate-y-[-2px] transition-all duration-300 snap-center"
            >
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {formatHourString(item.time)}
              </span>
              <div className="scale-110 my-1">{getWeatherIcon(item.code, 6)}</div>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {convertTemp(item.temp)}°{unit}
              </span>
              <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-mono">
                {item.humidity && <span className="text-blue-400/80">💧{item.humidity}%</span>}
                {item.windSpeed && <span className="text-teal-400/80">🌪️{item.windSpeed}k/h</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5-Day forecast with apple style range slider (6 columns) */}
      <div className="lg:col-span-6 flex flex-col gap-4 bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-800/20 rounded-3xl p-5 md:p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-amber-500" />
          5-Day Forecast
        </h3>
        
        <div className="flex flex-col gap-4 divide-y divide-slate-100/10">
          {daily.map((day, idx) => {
            // Calculate proportional width and offset for the temperature bar
            const minPercent = ((day.tempMin - globalMin) / tempSpan) * 100;
            const maxPercent = ((day.tempMax - globalMin) / tempSpan) * 100;
            const barWidth = maxPercent - minPercent;

            return (
              <div
                key={`${day.date}-${idx}`}
                className="flex items-center justify-between gap-4 pt-3 first:pt-0"
              >
                {/* Day name */}
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 w-24 truncate">
                  {idx === 0 ? "Today" : getDayName(day.date)}
                </span>

                {/* Weather icon in middle */}
                <div className="flex items-center justify-center w-8">
                  {getWeatherIcon(day.code, 5.5)}
                </div>

                {/* Min Temp */}
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 w-10 text-right">
                  {convertTemp(day.tempMin)}°
                </span>

                {/* Apple Weather Style Temp Range Bar */}
                <div className="flex-1 h-2 rounded-full bg-slate-100/10 dark:bg-slate-800/50 relative overflow-hidden hidden sm:block">
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-amber-500"
                    style={{
                      left: `${minPercent}%`,
                      width: `${Math.max(barWidth, 6)}%`,
                    }}
                  />
                </div>

                {/* Max Temp */}
                <span className="text-xs font-bold text-slate-850 dark:text-slate-200 w-10 text-right">
                  {convertTemp(day.tempMax)}°
                </span>
                
                {day.uvMax !== undefined && (
                  <span className="text-[10px] text-orange-400/80 font-mono hidden md:inline ml-1 bg-orange-400/10 px-1.5 rounded">
                    UV {Math.round(day.uvMax)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
