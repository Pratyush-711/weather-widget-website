import React, { useEffect, useRef, useState } from "react";
import { Compass, Tornado, Activity, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";

interface FlowRadarSandboxProps {
  temp: number;
  windSpeed: number;
  windDirection: number; // degrees
  humidity: number;
  cityName: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface FrontTrigger {
  x: number;
  y: number;
  type: "high" | "low";
  radius: number;
  strength: number;
  life: number;
}

export const FlowRadarSandbox: React.FC<FlowRadarSandboxProps> = ({
  temp,
  windSpeed,
  windDirection,
  humidity,
  cityName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTriggers, setActiveTriggers] = useState<FrontTrigger[]>([]);
  const [sensorAlertLevel, setSensorsAlertLevel] = useState<string>("Normal");
  const [airDensity, setAirDensity] = useState<number>(1.225); // kg/m^3 initial

  // Physics params
  const windAngleRad = ((windDirection - 90) * Math.PI) / 180; // Offset standard wind deg to math angle
  const actualWindSpeed = Math.max(windSpeed, 1.5) * 0.12; // Scaled for pixel simulation

  // Recalculate Air Density matching ISA formula
  // rho = p / (R*T) - we can approximate with custom temp & humidity offsets
  useEffect(() => {
    const kelvin = temp + 273.15;
    const baseDensity = 353.4 / kelvin; // Dry air approximation
    const humidityCorrected = baseDensity * (1 - (humidity / 100) * 0.015);
    setAirDensity(Number(humidityCorrected.toFixed(3)));

    if (windSpeed > 40) {
      setSensorsAlertLevel("Warning: Severe Wind shear");
    } else if (windSpeed > 20) {
      setSensorsAlertLevel("Caution: Moderate turbulence");
    } else {
      setSensorsAlertLevel("Status: Stable Airflow");
    }
  }, [temp, windSpeed, humidity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const maxParticles = 120;

    const resize = () => {
      const container = containerRef.current;
      if (container && canvas) {
        // High DPI scaling
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = 300 * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `300px`;
        ctx.scale(dpr, dpr);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const getParticleColor = () => {
      if (temp > 28) return `rgba(249, 115, 22, ${0.3 + Math.random() * 0.5})`; // Warm Orange
      if (temp > 15) return `rgba(234, 179, 8, ${0.3 + Math.random() * 0.5})`;  // Yellow
      if (temp < 0) return `rgba(186, 230, 253, ${0.3 + Math.random() * 0.5})`; // Ice blue
      return `rgba(59, 130, 246, ${0.3 + Math.random() * 0.5})`;               // Cool blue
    };

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * (canvas.width / (window.devicePixelRatio || 1)),
        y: Math.random() * 300,
        vx: Math.cos(windAngleRad) * actualWindSpeed + (Math.random() - 0.5) * 0.2,
        vy: Math.sin(windAngleRad) * actualWindSpeed + (Math.random() - 0.5) * 0.2,
        size: 1 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.6,
        color: getParticleColor(),
      });
    }

    // Interactive Fronts cache
    let triggers: FrontTrigger[] = [];
    
    // Core animation Loop
    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = 300;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw modern radar circular rings
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1.2;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
      ctx.stroke();

      // Radar sweep line drawing
      const timeMs = Date.now();
      const sweepAngle = (timeMs * 0.0012) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.06)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(sweepAngle) * 160, centerY + Math.sin(sweepAngle) * 160);
      ctx.stroke();

      // Radar cardinal marks
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
      ctx.fillText("N", centerX - 3, centerY - 110);
      ctx.fillText("S", centerX - 3, centerY + 118);
      ctx.fillText("W", centerX - 120, centerY + 3);
      ctx.fillText("E", centerX + 112, centerY + 3);

      // Draw interactive pressure fronts
      triggers.forEach((trigger, idx) => {
        trigger.life -= 0.016; // Tick down life
        
        ctx.strokeStyle = trigger.type === "high" 
          ? `rgba(239, 68, 68, ${0.15 * trigger.life})` 
          : `rgba(59, 130, 246, ${0.15 * trigger.life})`;
        ctx.fillStyle = trigger.type === "high" 
          ? `rgba(239, 68, 68, ${0.03 * trigger.life})` 
          : `rgba(59, 135, 246, ${0.03 * trigger.life})`;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(trigger.x, trigger.y, trigger.radius * (2.0 - trigger.life), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = trigger.type === "high" ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.4)";
        ctx.font = "8px monospace";
        ctx.fillText(trigger.type === "high" ? "HIGH FRONT" : "LOW CYCLONE", trigger.x - 24, trigger.y - 4);
      });

      // Filter expired triggers
      triggers = triggers.filter((t) => t.life > 0);

      // Update & Draw particles
      particles.forEach((p) => {
        // Base velocity matching wind vectors
        let dx = Math.cos(windAngleRad) * actualWindSpeed;
        let dy = Math.sin(windAngleRad) * actualWindSpeed;

        // Apply interactive force fields from triggers
        triggers.forEach((t) => {
          const distX = p.x - t.x;
          const distY = p.y - t.y;
          const distance = Math.hypot(distX, distY) || 1;
          
          if (distance < t.radius * 2) {
            const force = (t.strength * (1 - distance / (t.radius * 2))) * t.life;
            if (t.type === "high") {
              // High pressure repels particles outward
              dx += (distX / distance) * force * 1.5;
              dy += (distY / distance) * force * 1.5;
            } else {
              // Low cyclone draws particles inward & swirls
              const swirlX = -distY / distance;
              const swirlY = distX / distance;
              dx += (swirlX * force - (distX / distance) * force * 0.4);
              dy += (swirlY * force - (distY / distance) * force * 0.4);
            }
          }
        });

        // Update positions with fluid damping
        p.x += dx + (Math.random() - 0.5) * 0.15;
        p.y += dy + (Math.random() - 0.5) * 0.15;

        // Circular loop wrapping
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Color nodes
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Canvas click interceptor
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Toggle High or Low pressure trigger randomly
      const frontType = Math.random() > 0.4 ? "high" : "low";
      const newTrigger: FrontTrigger = {
        x: clickX,
        y: clickY,
        type: frontType,
        radius: 40 + Math.random() * 30,
        strength: frontType === "high" ? 2.2 : 3.0,
        life: 1.0,
      };

      triggers.push(newTrigger);
      setActiveTriggers([...triggers]);
    };

    canvas.addEventListener("mousedown", handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      if (canvas) {
        canvas.removeEventListener("mousedown", handleCanvasClick);
      }
    };
  }, [windDirection, windSpeed, temp, actualWindSpeed, windAngleRad]);

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/10 dark:border-slate-800/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4 relative z-10 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent font-display tracking-tight flex items-center gap-2">
            <Compass className="w-4.5 h-4.5 text-blue-500 animate-spin" style={{ animationDuration: "15s" }} />
            Fluid Atmospheric Flow Radar
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-md mt-0.5 leading-relaxed">
            Click anywhere inside the scope below to instantiate local high/low pressure fronts and visualize simulated vector turbulence.
          </p>
        </div>

        {/* Telemetry labels */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          <span className="px-2.5 py-1 bg-slate-100/5 dark:bg-slate-900/40 border border-slate-200/10 rounded-full text-slate-600 dark:text-slate-300">
            Density: <strong className="text-indigo-400">{airDensity} kg/m³</strong>
          </span>
          <span className={`px-2.5 py-1 border rounded-full font-semibold ${
            sensorAlertLevel.includes("Warning") 
              ? "bg-rose-500/15 border-rose-500/30 text-rose-500" 
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
          }`}>
            {sensorAlertLevel}
          </span>
        </div>
      </div>

      {/* Drawing Stage Container */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950/50 border border-slate-200/5 flex justify-center">
        <canvas ref={canvasRef} className="block w-full h-[300px] cursor-crosshair" />

        {/* Floating instruction flag */}
        <div className="absolute bottom-3 left-4 bg-slate-900/80 backdrop-blur border border-slate-200/10 rounded-xl py-1.5 px-3 flex items-center gap-1.5 pointer-events-none select-none text-[10px] text-slate-300 font-mono font-medium shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          Interactive Telemetry Engine Active
        </div>

        {/* Dynamic visual wind angle indicator */}
        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-200/10 rounded-xl p-2.5 flex flex-col justify-center items-center pointer-events-none select-none text-center shadow-md">
          <span className="text-[9px] text-slate-400 font-medium font-sans mb-1 select-none">WIND FORCE</span>
          <div 
            className="w-10 h-10 rounded-full border border-blue-500/30 flex items-center justify-center relative bg-slate-950/40"
            style={{ transform: `rotate(${windDirection}deg)` }}
          >
            <Compass className="w-5 h-5 text-sky-400" />
            <div className="absolute -top-1 w-2 h-2 bg-rose-500 rounded-full" />
          </div>
          <span className="text-[10px] font-bold font-mono mt-1.5 text-white">{windSpeed} k/h</span>
          <span className="text-[8px] text-sky-300 font-semibold font-mono">{windDirection}° N</span>
        </div>
      </div>

      {/* Climate Calibration metrics summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-100/5 p-3 rounded-2xl border border-slate-200/5 flex flex-col">
          <span className="text-[9px] text-slate-400 font-medium font-sans">CORIOLIS SCALING</span>
          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-350">
            {((2 * 7.2921e-5 * Math.sin((temp > 0 ? 51.5 : 23.5) * Math.PI / 180))).toExponential(3)} rad/s
          </span>
        </div>

        <div className="bg-slate-100/5 p-3 rounded-2xl border border-slate-200/5 flex flex-col">
          <span className="text-[9px] text-slate-400 font-medium font-sans">FLUID SHEAR GRADIENT</span>
          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-350">
            {(windSpeed * 0.085).toFixed(2)} s⁻¹
          </span>
        </div>

        <div className="bg-slate-100/5 p-3 rounded-2xl border border-slate-200/5 flex flex-col">
          <span className="text-[9px] text-slate-400 font-medium font-sans">REYNOLDS COEFFICIENT</span>
          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-350">
            {(windSpeed * airDensity * 1250).toLocaleString()} Re
          </span>
        </div>

        <div className="bg-slate-100/5 p-3 rounded-2xl border border-slate-200/5 flex flex-col">
          <span className="text-[9px] text-slate-400 font-medium font-sans">THERMAL EXPANSION EXP</span>
          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-350">
            {(3.67e-3 * temp).toFixed(4)} K⁻¹
          </span>
        </div>
      </div>
    </div>
  );
};
