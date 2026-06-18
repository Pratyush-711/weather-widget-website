import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

const app = express();
const PORT = 3000;

app.use(express.json());

// Helpers to map weather codes
function mapWmoCodeToState(code: number): string {
  // 0: Sunny, 1-3: Cloudy, 45-48: Misty, 51-57: Rainy (drizzle), 61-67: Rainy, 71-77: Snowy, 80-82: Rainy (showers), 85-86: Snowy, 95-99: Storm
  if (code === 0) return "sunny";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "misty";
  if (code >= 51 && code <= 57) return "rainy";
  if (code >= 61 && code <= 67) return "rainy";
  if (code >= 71 && code <= 77) return "snowy";
  if (code >= 80 && code <= 82) return "rainy";
  if (code === 85 || code === 86) return "snowy";
  if (code >= 95 && code <= 99) return "storm";
  return "cloudy";
}

function mapOwmIdToState(id: number): string {
  if (id === 800) return "sunny";
  if (id > 800 && id < 900) return "cloudy";
  if (id >= 700 && id < 800) return "misty";
  if (id >= 500 && id < 600) return "rainy";
  if (id >= 300 && id < 400) return "rainy";
  if (id >= 200 && id < 300) return "storm";
  if (id >= 600 && id < 700) return "snowy";
  return "cloudy";
}

// Format date to local city time using timezone offset
function formatTimeFromTimestamp(timestamp: number, offsetSeconds: number): string {
  const utcDate = new Date(timestamp * 1000);
  const localDate = new Date(utcDate.getTime() + offsetSeconds * 1000);
  return localDate.getUTCHours().toString().padStart(2, "0") + ":" + localDate.getUTCMinutes().toString().padStart(2, "0");
}

async function fetchGeocoding(city: string) {
  // Let's first look if we can use the OpenWeatherMap geolocator (if API key exists)
  const owmKey = process.env.OPENWEATHERMAP_API_KEY;
  if (owmKey) {
    try {
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${owmKey}`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            name: data[0].name,
            country: data[0].country,
            lat: data[0].lat,
            lon: data[0].lon,
          };
        }
      }
    } catch (e) {
      console.error("OWM Geocoding failed, falling back", e);
    }
  }

  // Fallback to open-meteo free geocoding
  const openMeteoGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoRes = await fetch(openMeteoGeoUrl);
  if (!geoRes.ok) {
    throw new Error(`Failed to find location matching "${city}"`);
  }
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`No locations found matching "${city}"`);
  }
  const match = geoData.results[0];
  return {
    name: match.name,
    country: match.country_code || match.country || "",
    lat: match.latitude,
    lon: match.longitude,
  };
}

// Endpoint to fetch unified weather data
app.get("/api/weather", async (req, res) => {
  try {
    const { city, lat: latQuery, lon: lonQuery } = req.query;

    let lat: number;
    let lon: number;
    let cityName = "";
    let countryCode = "";

    if (latQuery && lonQuery) {
      lat = parseFloat(latQuery as string);
      lon = parseFloat(lonQuery as string);
      cityName = "Coordinates Location";
      countryCode = "LOC";
      
      // Attempt reversed geocoding to get a nicer name using open-meteo or standard reversed-coord if needed
      try {
        const revGeoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
        const revRes = await fetch(revGeoUrl, {
          headers: { "User-Agent": "WeatherDashboardApplet/1.0" }
        });
        if (revRes.ok) {
          const revData = await revRes.json();
          cityName = revData.address?.city || revData.address?.town || revData.address?.village || revData.address?.county || "Current Location";
          countryCode = (revData.address?.country_code || "LOC").toUpperCase();
        }
      } catch (er) {
        console.error("Reverse geocoding failed, using coordinates name", er);
      }
    } else if (city) {
      const geoResult = await fetchGeocoding(city as string);
      lat = geoResult.lat;
      lon = geoResult.lon;
      cityName = geoResult.name;
      countryCode = geoResult.country;
    } else {
      return res.status(400).json({ error: "Missing query parameters (city or lat/lon coordinates)" });
    }

    const owmKey = process.env.OPENWEATHERMAP_API_KEY;

    if (owmKey) {
      // Fetch using OpenWeatherMap API
      try {
        // Fetch Parallel current, forecast, air quality
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${owmKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${owmKey}`;
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${owmKey}`;

        const [currRes, foreRes, aqiRes] = await Promise.all([
          fetch(currentUrl),
          fetch(forecastUrl),
          fetch(aqiUrl).catch(() => null),
        ]);

        if (!currRes.ok || !foreRes.ok) {
          throw new Error("Failed to fetch weather from OpenWeatherMap API");
        }

        const currData = await currRes.json();
        const foreData = await foreRes.json();
        let aqiData = aqiRes && aqiRes.ok ? await aqiRes.json() : null;

        const timezoneOffset = currData.timezone || 0;
        const currentStats = currData.main || {};
        const windStats = currData.wind || {};
        const weatherObj = currData.weather?.[0] || {};
        const systemStats = currData.sys || {};
        const aqiValue = aqiData?.list?.[0]?.main?.aqi || 3; // 1 to 5
        const pollutionComponents = aqiData?.list?.[0]?.components || {};

        // Hourly: OWM provides 3-hour forecasts, let's map them as hourly
        const hourlyConverted = foreData.list.slice(0, 8).map((item: any) => {
          return {
            time: item.dt_txt,
            temp: item.main.temp,
            code: mapOwmIdToState(item.weather?.[0]?.id || 800),
            weatherId: item.weather?.[0]?.id || 800,
            icon: item.weather?.[0]?.icon || "01d",
            humidity: item.main.humidity,
          };
        });

        // 5-Day Forecast: Take one reading per day (e.g. around 12:00)
        const dailyMap = new Map<string, any>();
        foreData.list.forEach((item: any) => {
          const dateStr = item.dt_txt.split(" ")[0];
          const currItem = dailyMap.get(dateStr);
          if (!currItem) {
            dailyMap.set(dateStr, {
              date: dateStr,
              tempMax: item.main.temp_max,
              tempMin: item.main.temp_min,
              code: mapOwmIdToState(item.weather?.[0]?.id || 800),
              weatherId: item.weather?.[0]?.id || 800,
              icon: item.weather?.[0]?.icon || "01d",
            });
          } else {
            if (item.main.temp_max > currItem.tempMax) currItem.tempMax = item.main.temp_max;
            if (item.main.temp_min < currItem.tempMin) currItem.tempMin = item.main.temp_min;
          }
        });
        const dailyConverted = Array.from(dailyMap.values()).slice(0, 5);

        return res.json({
          source: "OpenWeatherMap",
          city: {
            name: currData.name || cityName,
            country: systemStats.country || countryCode,
            lat,
            lon,
            timezone: `GMT${timezoneOffset >= 0 ? "+" : ""}${Math.round(timezoneOffset / 3600)}`,
            timezoneOffset,
          },
          current: {
            temp: currentStats.temp,
            feelsLike: currentStats.feels_like,
            humidity: currentStats.humidity,
            windSpeed: windStats.speed,
            windDirection: windStats.deg,
            pressure: currentStats.pressure,
            visibility: (currData.visibility || 10000) / 1000, // into km
            uvIndex: 0, // UV Index is not in standard OWM weather endpoint without separate One Call API key
            description: weatherObj.description,
            code: mapOwmIdToState(weatherObj.id || 800),
            weatherId: weatherObj.id || 800,
            icon: weatherObj.icon || "01d",
            sunrise: formatTimeFromTimestamp(systemStats.sunrise, timezoneOffset),
            sunset: formatTimeFromTimestamp(systemStats.sunset, timezoneOffset),
            aqi: aqiValue,
            pm25: pollutionComponents.pm2_5 || 0,
            pm10: pollutionComponents.pm10 || 0,
            no2: pollutionComponents.no2 || 0,
            o3: pollutionComponents.o3 || 0,
          },
          hourly: hourlyConverted,
          daily: dailyConverted,
        });
      } catch (owmError) {
        console.error("OpenWeatherMap fetch failed, falling back to Open-Meteo", owmError);
      }
    }

    // Default fully free Open-Meteo fetch
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
    const aqiMeteoUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;

    const [meteoRes, aqiMeteoRes] = await Promise.all([
      fetch(meteoUrl),
      fetch(aqiMeteoUrl).catch(() => null),
    ]);

    if (!meteoRes.ok) {
      throw new Error("Failed to fetch weather data from Open-Meteo");
    }

    const meteoData = await meteoRes.json();
    const aqiMeteoData = aqiMeteoRes && aqiMeteoRes.ok ? await aqiMeteoRes.json() : null;

    const currentMeteo = meteoData.current;
    const dailyMeteo = meteoData.daily;
    const hourlyMeteo = meteoData.hourly;

    const currentCode = currentMeteo.weather_code;
    const mappedState = mapWmoCodeToState(currentCode);

    // Grab correct timezone offset
    const timezoneOffset = meteoData.utc_offset_seconds || 0;

    // Helper map index to OWM matching index helper
    // 0 = sunny (800), 1-3 = cloudy (803), rain (500), storm (200), snowy (600)
    const mapWmoToOwmId = (code: number) => {
      if (code === 0) return 800;
      if (code >= 1 && code <= 3) return 803;
      if (code === 45 || code === 48) return 741;
      if (code >= 51 && code <= 57) return 300;
      if (code >= 61 && code <= 67) return 500;
      if (code >= 71 && code <= 77) return 600;
      if (code >= 80 && code <= 82) return 521;
      if (code === 85 || code === 86) return 621;
      if (code >= 95 && code <= 99) return 200;
      return 803;
    };

    // Calculate dynamic AQI from US AQI scale or default
    const usAqi = aqiMeteoData?.current?.us_aqi || 50; 
    // US AQI mapping to 1-5 index:
    // 0-50: 1 (Good), 51-100: 2 (Fair), 101-150: 3 (Moderate), 151-200: 4 (Poor), 201+: 5 (Very Poor)
    let calcAqi = 1;
    if (usAqi <= 50) calcAqi = 1;
    else if (usAqi <= 100) calcAqi = 2;
    else if (usAqi <= 150) calcAqi = 3;
    else if (usAqi <= 200) calcAqi = 4;
    else calcAqi = 5;

    // Map open-meteo weather code to beautiful string description
    const weatherDescriptions: Record<number, string> = {
      0: "Clear Sky",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Depositing Rime Fog",
      51: "Light Drizzle",
      53: "Moderate Drizzle",
      55: "Dense Drizzle",
      56: "Light Freezing Drizzle",
      57: "Dense Freezing Drizzle",
      61: "Slight Rain",
      63: "Moderate Rain",
      65: "Heavy Rain",
      66: "Light Freezing Rain",
      67: "Heavy Freezing Rain",
      71: "Slight Snowfall",
      73: "Moderate Snowfall",
      75: "Heavy Snowfall",
      77: "Snow Grains",
      80: "Slight Rain Showers",
      81: "Moderate Rain Showers",
      82: "Violent Rain Showers",
      85: "Slight Snow Showers",
      86: "Heavy Snow Showers",
      95: "Thunderstorm",
      96: "Thunderstorm with Slight Hail",
      99: "Thunderstorm with Heavy Hail",
    };

    const description = weatherDescriptions[currentCode] || "Overcast";

    // Format hourly mapping
    // Filter down to the next 24 hours of hourly predictions (every 3 hours to not bloat payload)
    const hourlyConverted: any[] = [];
    const nowTime = new Date().getTime();
    for (let i = 0; i < hourlyMeteo.time.length; i++) {
      const timeStr = hourlyMeteo.time[i];
      const epoch = new Date(timeStr).getTime();
      // Only show upcoming hours or next 24 hours
      if (epoch >= nowTime - 7200000 && hourlyConverted.length < 8) {
        hourlyConverted.push({
          time: timeStr.replace("T", " "),
          temp: hourlyMeteo.temperature_2m[i],
          code: mapWmoCodeToState(hourlyMeteo.weather_code[i]),
          weatherId: mapWmoToOwmId(hourlyMeteo.weather_code[i]),
          humidity: hourlyMeteo.relative_humidity_2m[i],
          windSpeed: hourlyMeteo.wind_speed_10m[i],
        });
      }
    }

    // Format daily mapping (5 days)
    const dailyConverted = dailyMeteo.time.map((timeStr: string, idx: number) => {
      return {
        date: timeStr,
        tempMax: dailyMeteo.temperature_2m_max[idx],
        tempMin: dailyMeteo.temperature_2m_min[idx],
        code: mapWmoCodeToState(dailyMeteo.weather_code[idx]),
        weatherId: mapWmoToOwmId(dailyMeteo.weather_code[idx]),
        uvMax: dailyMeteo.uv_index_max[idx],
      };
    }).slice(0, 5);

    const sunriseEp = new Date(dailyMeteo.sunrise[0]).getTime() / 1000;
    const sunsetEp = new Date(dailyMeteo.sunset[0]).getTime() / 1000;

    return res.json({
      source: "Open-Meteo",
      city: {
        name: cityName,
        country: countryCode,
        lat,
        lon,
        timezone: meteoData.timezone,
        timezoneOffset,
      },
      current: {
        temp: currentMeteo.temperature_2m,
        feelsLike: currentMeteo.apparent_temperature,
        humidity: currentMeteo.relative_humidity_2m,
        windSpeed: currentMeteo.wind_speed_10m,
        windDirection: currentMeteo.wind_direction_10m,
        pressure: currentMeteo.pressure_msl,
        visibility: currentMeteo.visibility / 1000 || 10, // code returns in meters usually
        uvIndex: dailyMeteo.uv_index_max[0] || 0,
        description,
        code: mappedState,
        weatherId: mapWmoToOwmId(currentCode),
        sunrise: formatTimeFromTimestamp(sunriseEp, timezoneOffset),
        sunset: formatTimeFromTimestamp(sunsetEp, timezoneOffset),
        aqi: calcAqi,
        pm25: aqiMeteoData?.current?.pm2_5 || 10,
        pm10: aqiMeteoData?.current?.pm10 || 15,
        no2: aqiMeteoData?.current?.nitrogen_dioxide || 5.2,
        o3: aqiMeteoData?.current?.ozone || 45.1,
      },
      hourly: hourlyConverted,
      daily: dailyConverted,
    });
  } catch (error: any) {
    console.error("General weather endpoint error:", error);
    res.status(500).json({ error: error.message || "An error occurred while fetching weather data." });
  }
});

// AI weather assistant chatbot/forecast-summary route
app.post("/api/ai/briefing", async (req, res) => {
  try {
    if (!ai) {
      return res.json({
        briefing: "AI insights require a GEMINI_API_KEY. Please provide this in Settings to unlock your custom travel and outfit recommendations!",
        activities: [],
      });
    }

    const { city, current, daily } = req.body;

    const weatherPrompt = `
      You are an expert meteorological assistant. Read this weather data for "${city}":
      - Current Temp: ${current.temp}°C (Feels like ${current.feelsLike}°C)
      - Humidity: ${current.humidity}%, Condition: "${current.description}"
      - Wind: ${current.windSpeed} km/h, UV Index: ${current.uvIndex}
      - 5-Day Max Temperature Forecast: ${daily.map((d: any) => d.tempMax + "°C on " + d.date).join(", ")}

      Perform the following tasks:
      1. Write a delightful, highly engaging, personalized 2-3 sentence Weather Briefing for this city. Mention outfit suggestions and direct general weather recommendations. Do not use markdown headers, start directly with the greeting.
      2. Recommend 4 specific structured activities for today in this city based on this weather. Provide the response as a JSON array of objects with the fields:
         - "name": activity name
         - "type": "outdoor" or "indoor"
         - "rating": percentage of weather suitability (e.g., "95%")
         - "reason": detailed one-sentence reasoning.

      Return your entire response strictly as a JSON object of this structure:
      {
        "briefing": "briefing text...",
        "activities": [
           { "name": "...", "type": "...", "rating": "...", "reason": "..." }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: weatherPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const bodyText = response.text || "{}";
    res.json(JSON.parse(bodyText));
  } catch (err: any) {
    console.error("Gemini AI Briefing trigger failed:", err);
    res.json({
      briefing: "Your weather looks standard! Dress comfortably, layered for change, and look out for unexpected clouds.",
      activities: [
        { name: "City Walking Tour", type: "outdoor", rating: "85%", reason: "Great way to stretch your legs and sightsee!" },
        { name: "Coffee Shop Reading", type: "indoor", rating: "95%", reason: "A cozy local cafe is always perfect." }
      ],
    });
  }
});

// AI Chatbot weather assistant route
app.post("/api/ai/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.json({
        reply: "AI chat requires a GEMINI_API_KEY. Please set this up in the Settings menu to chat with the Tempest Meteorologist!",
      });
    }

    const { city, current, message, history = [] } = req.body;

    const chatContext = `
      You are the Tempest Weather Assistant - a warm, expert, and playful meteorologist companion.
      The user is asking a question while looking at the weather for "${city}".
      Current weather details:
      - Temperature: ${current.temp}°C (Feels like ${current.feelsLike}°C)
      - Humidity: ${current.humidity}%
      - Current conditions: "${current.description}"
      - Wind: ${current.windSpeed} km/h
      - UV Index: ${current.uvIndex}
      - Air Quality index: ${current.aqi} (1: Excellent, 2: Fair, 3: Moderate, 4: Poor, 5: Very Poor)

      Respond to their query in a highly engaging, professional yet friendly, conversational way, referencing the location and its weather if relevant. Limit your answer to 2 or 3 sentences maximum. Keep it concise.
    `;

    const chatInput = [
      { role: "user", parts: [{ text: chatContext }] },
      ...history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatInput,
      config: {
        temperature: 0.8,
      }
    });

    res.json({ reply: response.text || "I was unable to retrieve an analysis right now. Let's keep watching the sky!" });
  } catch (err: any) {
    console.error("AI Weather Chat error:", err);
    res.json({ reply: "The storm blocks communications. I'll check my barometers and be right with you!" });
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
