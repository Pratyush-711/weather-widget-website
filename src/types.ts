export interface CityInfo {
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  timezoneOffset: number;
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  description: string;
  code: string; // "sunny" | "cloudy" | "rainy" | "snowy" | "storm" | "misty"
  weatherId: number;
  icon?: string;
  sunrise: string;
  sunset: string;
  aqi: number; // 1-5 index
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
}

export interface HourlyWeather {
  time: string;
  temp: number;
  code: string;
  weatherId: number;
  humidity: number;
  windSpeed?: number;
}

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  code: string;
  weatherId: number;
  uvMax?: number;
}

export interface WeatherData {
  source: string;
  city: CityInfo;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

export interface AiActivity {
  name: string;
  type: "outdoor" | "indoor";
  rating: string;
  reason: string;
}

export interface AiBriefing {
  briefing: string;
  activities: AiActivity[];
}
