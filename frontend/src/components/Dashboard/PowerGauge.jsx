/**
 * PowerGauge - Power Consumption/Regeneration Display
 * 
 * FIXED VERSION:
 * - All text in English
 * - Horizontal bar showing -80kW (regen) to +150kW (consumption)
 */
import React from 'react';

export default function PowerGauge({ 
  power = 0, 
  maxPower = 150,
  maxRegen = -80,
  efficiency = null,
}) {
  // Normalize power to percentage (-100 to 100)
  const getPercentage = () => {
    if (power >= 0) {
      return Math.min(100, (power / maxPower) * 100);
    } else {
      return Math.max(-100, (power / Math.abs(maxRegen)) * -100);
    }
  };

  const percentage = getPercentage();
  const isRegen = power < 0;

  // Color based on consumption level
  const getColor = () => {
    if (isRegen) return '#00a8ff'; // Blue for regen
    if (power > 80) return '#ff3b30'; // Red
    if (power > 50) return '#ff9500'; // Orange
    if (power > 30) return '#ffcc00'; // Yellow
    return '#00d26a'; // Green
  };

  const color = getColor();

  return (
    <div className="ev-card rounded-xl p-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400 text-xs uppercase tracking-wider">Power</span>
        <div className="flex items-center gap-2">
          <span 
            className="text-xl font-bold number-display"
            style={{ color }}
          >
            {power >= 0 ? '+' : ''}{power.toFixed(1)}
          </span>
          <span className="text-gray-500 text-xs">kW</span>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative h-5 rounded-full bg-ev-darker overflow-hidden">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-600 z-10" />
        
        {/* Regen side (left) */}
        {isRegen && (
          <div
            className="absolute right-1/2 top-0 bottom-0 rounded-l-full transition-all duration-300"
            style={{
              width: `${Math.abs(percentage) / 2}%`,
              backgroundColor: color,
              boxShadow: `0 0 20px ${color}40`,
            }}
          />
        )}
        
        {/* Consumption side (right) */}
        {!isRegen && power > 0 && (
          <div
            className="absolute left-1/2 top-0 bottom-0 rounded-r-full transition-all duration-300"
            style={{
              width: `${percentage / 2}%`,
              backgroundColor: color,
              boxShadow: `0 0 20px ${color}40`,
            }}
          />
        )}

        {/* Scale markers */}
        <div className="absolute inset-0 flex justify-between items-center px-2 text-[9px] text-gray-500">
          <span>{maxRegen}</span>
          <span>0</span>
          <span>+{maxPower}</span>
        </div>
      </div>

      {/* Footer with efficiency */}
      <div className="flex justify-between items-center mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          {isRegen ? (
            <>
              <span className="text-blue-400">🔋</span>
              <span className="text-blue-400">Regeneration</span>
            </>
          ) : power > 50 ? (
            <>
              <span className="text-orange-400">⚡</span>
              <span className="text-orange-400">High consumption</span>
            </>
          ) : (
            <>
              <span className="text-green-400">⚡</span>
              <span className="text-green-400">Normal</span>
            </>
          )}
        </div>
        
        {efficiency !== null && efficiency > 0 && (
          <div className="text-gray-400">
            <span className="font-mono">{efficiency.toFixed(1)}</span>
            <span className="ml-1">kWh/100km</span>
          </div>
        )}
      </div>
    </div>
  );
}