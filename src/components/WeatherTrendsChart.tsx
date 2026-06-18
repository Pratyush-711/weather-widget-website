import React, { useState } from "react";
import { AreaChart, TrendingUp, Sparkles, Droplets, Wind, Percent } from "lucide-react";
import { HourlyWeather } from "../types";

interface WeatherTrendsChartProps {
  hourly: HourlyWeather[];
  unit: "C" | "F";
}

export const WeatherTrendsChart: React.FC<WeatherTrendsChartProps> = ({ hourly, unit }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const convertTemp = (tempC: number) => {
    if (unit === "F") {
      return Math.round((tempC * 9) / 5 + 32);
    }
    return Math.round(tempC);
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

  if (!hourly || hourly.length === 0) return null;

  // Render SVG Dimension parameters
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 30;

  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  // Extract values
  const temps = hourly.map((h) => convertTemp(h.temp));
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const tempRange = maxTemp - minTemp || 1;

  // Calculate coordinates for SVG
  const points = hourly.map((item, idx) => {
    const x = paddingX + (idx / (hourly.length - 1)) * graphWidth;
    const currentTemp = convertTemp(item.temp);
    // Invert Y axis since 0,0 is top-left in SVG
    const y = paddingY + graphHeight - ((currentTemp - minTemp) / tempRange) * graphHeight;
    return { x, y, temp: currentTemp, time: item.time, humidity: item.humidity, wind: item.windSpeed || 0 };
  });

  // Create SVG path string using cubic splines or simple strings
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Cubic bezier control points for beautiful curve
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  // Linear path for area fill
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  const activePoint = activeIdx !== null ? points[activeIdx] : points[0];

  return (
    <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/10 dark:border-slate-800/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4 relative z-10">
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-display tracking-tight flex items-center gap-1.5">
            <AreaChart className="w-4.5 h-4.5 text-orange-400" />
            Micro-Climatic Thermal Trends
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Interactive temperature & relative humidity timeline curve. Hover over points below.
          </p>
        </div>

        {/* Hover telemetry callout */}
        <div className="bg-slate-100/5 dark:bg-slate-900/50 border border-slate-200/10 py-1.5 px-3 rounded-xl flex items-center gap-3 text-[10px] font-mono shadow-sm">
          <span className="text-slate-400">Time: <strong className="text-white">{formatHourString(activePoint.time)}</strong></span>
          <span className="h-3 w-[1px] bg-slate-200/10" />
          <span className="text-amber-400">Temp: <strong className="text-white">{activePoint.temp}°{unit}</strong></span>
          <span className="h-3 w-[1px] bg-slate-200/10 animate-pulse" />
          <span className="text-blue-400">Humidity: <strong className="text-white">{activePoint.humidity}%</strong></span>
        </div>
      </div>

      {/* SVG Canvas View */}
      <div className="relative w-full overflow-hidden">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto drop-shadow-[0_2px_8px_rgba(249,115,22,0.1)] overflow-visible"
        >
          <defs>
            {/* Dynamic Gold to Blue gradient for theme matching */}
            <linearGradient id="glow-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0.25)" />
              <stop offset="50%" stopColor="rgba(234, 179, 8, 0.08)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.00)" />
            </linearGradient>

            <linearGradient id="stroke-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.85)" />
              <stop offset="50%" stopColor="rgba(234, 179, 8, 0.85)" />
              <stop offset="100%" stopColor="rgba(249, 115, 22, 0.85)" />
            </linearGradient>
          </defs>

          {/* Grid lines inside SVG */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(148, 163, 184, 0.05)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={paddingY + graphHeight / 2} x2={width - paddingX} y2={paddingY + graphHeight / 2} stroke="rgba(148, 163, 184, 0.05)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1.2" />

          {/* Render gradient fill area under the line curve */}
          {areaD && <path d={areaD} fill="url(#glow-area-gradient)" />}

          {/* Render primary Temperature Spline Line connected curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#stroke-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Time text markers along X axis */}
          {points.map((point, idx) => (
            <g key={idx}>
              {/* Draw hover active anchor lines */}
              {activeIdx === idx && (
                <line
                  x1={point.x}
                  y1={paddingY}
                  x2={point.x}
                  y2={height - paddingY}
                  stroke="rgba(234, 179, 8, 0.25)"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
              )}

              {/* Minute ticks on X axes */}
              <text
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                fontSize="8.5"
                fontFamily="monospace"
                fill="rgba(148, 163, 184, 0.45)"
              >
                {formatHourString(point.time).replace(" ", "")}
              </text>

              {/* Temp values label above nodes */}
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill={activeIdx === idx ? "rgba(249, 115, 22, 1)" : "rgba(148, 163, 184, 0.75)"}
                className="font-mono transition-all duration-300 pointer-events-none"
              >
                {point.temp}°
              </text>

              {/* Point anchors on vertices */}
              <circle
                cx={point.x}
                cy={point.y}
                r={activeIdx === idx ? 5 : 3.5}
                fill={activeIdx === idx ? "rgba(249, 115, 22, 1)" : "rgba(30, 41, 59, 1)"}
                stroke={activeIdx === idx ? "#ffffff" : "rgba(234, 179, 8, 0.85)"}
                strokeWidth={activeIdx === idx ? 1.5 : 1.2}
                className="transition-all duration-250 cursor-pointer"
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Grid metrics overlay below graph */}
      <div className="grid grid-cols-3 gap-3 border-t border-slate-200/5 pt-3.5 text-center text-xs font-mono">
        <div className="bg-slate-100/5 p-2 rounded-2xl flex flex-col justify-center">
          <span className="text-[9px] text-slate-400 font-medium font-sans mb-0.5">HIGH AMPLITUDE</span>
          <span className="font-bold text-orange-400">{maxTemp}°{unit}</span>
        </div>
        <div className="bg-slate-100/5 p-2 rounded-2xl flex flex-col justify-center">
          <span className="text-[9px] text-slate-400 font-medium font-sans mb-0.5">LOW AMPLITUDE</span>
          <span className="font-bold text-sky-400">{minTemp}°{unit}</span>
        </div>
        <div className="bg-slate-100/5 p-2 rounded-2xl flex flex-col justify-center">
          <span className="text-[9px] text-slate-400 font-medium font-sans mb-0.5">DIFFERENTIAL VARIANCE</span>
          <span className="font-bold text-slate-300">{(maxTemp - minTemp)}°{unit}</span>
        </div>
      </div>

    </div>
  );
};
