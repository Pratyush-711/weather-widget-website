import React from "react";

interface WeatherBackgroundProps {
  code: string; // sunny, cloudy, rainy, snowy, storm, misty
}

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ code }) => {
  const renderAtmosphere = () => {
    switch (code) {
      case "sunny":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Pulsing Sun Rays in Top Right */}
            <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-yellow-400/20 blur-3xl sun-glow" />
            <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-orange-300/10 blur-3xl sun-glow" style={{ animationDelay: "2s" }} />
          </div>
        );
      case "cloudy":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
            {/* Drifting Clouds */}
            <div className="absolute top-10 left-10 w-48 h-16 rounded-full bg-white/30 blur-md cloud-drift-slow" />
            <div className="absolute top-1/3 right-20 w-72 h-24 rounded-full bg-white/20 blur-lg cloud-drift-fast" />
            <div className="absolute bottom-20 left-1/4 w-96 h-32 rounded-full bg-white/10 blur-xl cloud-drift-slow" style={{ animationDelay: "4s" }} />
          </div>
        );
      case "rainy":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Animated Raindrops falling down */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-[1.5px] h-10 bg-blue-300/40 rounded-full rain-drop"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * -20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.8 + Math.random() * 0.8}s`,
                }}
              />
            ))}
            {/* Overcast ambient mist */}
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px]" />
          </div>
        );
      case "storm":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Raindrops */}
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-[1.5px] h-12 bg-blue-400/30 rounded-full rain-drop"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * -20}%`,
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${0.6 + Math.random() * 0.6}s`,
                }}
              />
            ))}
            {/* Lightning Flash Effect via pulsing background overlay */}
            <div
              className="absolute inset-0 bg-white/5 opacity-0 animate-pulse pointer-events-none"
              style={{ animationDuration: "4s" }}
            />
          </div>
        );
      case "snowy":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Falling Snowflakes floating down */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/60 blur-[0.5px] animate-bounce"
                style={{
                  width: `${3 + Math.random() * 5}px`,
                  height: `${3 + Math.random() * 5}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: 0.3 + Math.random() * 0.5,
                  animationDuration: `${3 + Math.random() * 3}s`,
                }}
              />
            ))}
          </div>
        );
      case "misty":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Blurry Fog blocks shifting slightly */}
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-slate-100/10 blur-3xl" />
            <div className="absolute inset-0 bg-slate-200/5 backdrop-blur-[2px]" />
          </div>
        );
      default:
        return null;
    }
  };

  return <>{renderAtmosphere()}</>;
};
