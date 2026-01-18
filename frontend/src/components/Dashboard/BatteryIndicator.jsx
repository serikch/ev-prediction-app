import React from 'react';
import { Battery, BatteryCharging, BatteryLow, BatteryWarning } from 'lucide-react';

/**
 * Battery level indicator with estimated range
 */
export default function BatteryIndicator({ 
  soc = 80, 
  estimatedRange = null,
  isCharging = false,
  batteryCapacity = 60.5, // kWh
  averageEfficiency = 18, // kWh/100km
}) {
  // Calculate estimated range if not provided
  const range = estimatedRange ?? Math.round((soc / 100) * batteryCapacity * (100 / averageEfficiency));

  // Color based on SOC
  const getColor = () => {
    if (soc <= 10) return '#ff3b30';
    if (soc <= 20) return '#ff9500';
    if (soc <= 35) return '#ffcc00';
    return '#00d26a';
  };

  const color = getColor();

  // Battery icon
  const BatteryIcon = () => {
    if (isCharging) return <BatteryCharging className="w-5 h-5" />;
    if (soc <= 10) return <BatteryLow className="w-5 h-5" />;
    if (soc <= 20) return <BatteryWarning className="w-5 h-5" />;
    return <Battery className="w-5 h-5" />;
  };

  return (
    <div className="ev-card rounded-2xl p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2" style={{ color }}>
          <BatteryIcon />
          <span className="text-sm uppercase tracking-wider text-gray-400">Batterie</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span 
            className="text-3xl font-bold number-display"
            style={{ color }}
          >
            {Math.round(soc)}
          </span>
          <span className="text-gray-500">%</span>
        </div>
      </div>

      {/* Battery bar */}
      <div className="relative h-8 rounded-lg bg-ev-darker border border-gray-700 overflow-hidden">
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-md transition-all duration-500 battery-fill"
          style={{
            width: `${soc}%`,
            background: `linear-gradient(90deg, 
              ${soc <= 20 ? color : '#ff3b30'} 0%, 
              ${soc <= 35 ? color : '#ff9500'} 20%, 
              ${soc <= 50 ? color : '#ffcc00'} 35%, 
              #00d26a 50%, 
              #00d26a 100%
            )`,
            backgroundSize: `${100 / (soc / 100)}% 100%`,
            boxShadow: `0 0 20px ${color}40`,
          }}
        />

        {/* Segment lines */}
        <div className="absolute inset-0 flex">
          {[25, 50, 75].map(pos => (
            <div 
              key={pos}
              className="absolute top-0 bottom-0 w-px bg-gray-600/50"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>

        {/* Charging animation */}
        {isCharging && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        )}
      </div>

      {/* Footer - Range estimation */}
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Autonomie estimÃ©e</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold number-display" style={{ color }}>
            {range}
          </span>
          <span className="text-gray-500 text-sm">km</span>
        </div>
      </div>

      {/* Low battery warning */}
      {soc <= 20 && !isCharging && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          <BatteryWarning className="w-4 h-4" />
          <span>Batterie faible - Recherchez une borne</span>
        </div>
      )}
    </div>
  );
}
