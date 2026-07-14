"use client";

import type { WeatherReading } from "@/lib/api";

/** Purely atmospheric overlay above the terrain, below nothing
 * interactive (pointer-events-none throughout) -- driven by the farm's
 * real latest WEATHER_READINGS row, not decorative-only. */

function sunGlowOpacity(tempC: number): number {
  // ~0.1 around 15C rising to ~0.5 by the high 30s, clamped both ends.
  return Math.max(0.08, Math.min(0.5, (tempC - 15) / 46));
}

const RAINDROP_COUNT = 18;

export function WeatherAmbience({ weather }: { weather: WeatherReading | null }) {
  if (!weather) return null;

  const isRaining = weather.rainfall_mm > 0.5;
  const glowOpacity = sunGlowOpacity(weather.temp_c);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-b from-amber-200 to-transparent dark:from-amber-400/60"
        style={{ opacity: glowOpacity }}
      />

      <div className="absolute top-4 h-8 w-32 animate-[cloud-drift-a_30s_linear_infinite] rounded-full bg-white/60 blur-md dark:bg-white/15" />
      <div className="absolute top-12 h-6 w-24 animate-[cloud-drift-b_38s_linear_infinite] rounded-full bg-white/50 blur-md dark:bg-white/10" />

      {isRaining && (
        <div className="absolute inset-0" aria-hidden>
          {Array.from({ length: RAINDROP_COUNT }).map((_, i) => (
            <span
              key={i}
              className="absolute h-6 w-[2px] animate-[rain-fall_0.8s_linear_infinite] bg-sky-400/60 dark:bg-sky-300/40"
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 10) * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
