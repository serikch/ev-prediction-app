/**
 * TripStats - Trip Statistics Display
 * 
 * FIXED VERSION:
 * - All text in English
 * - Better mobile layout
 * - Shows cumulative trip statistics
 */
import { useMemo } from 'react';
import { 
  Route, 
  Zap, 
  Gauge, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

export default function TripStats({
  distance = 0,
  energyUsed = 0,
  avgEfficiency = 0,
  duration = 0,
}) {
  // Format duration
  const formattedDuration = useMemo(() => {
    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [duration]);
  
  // Efficiency rating
  const efficiencyRating = useMemo(() => {
    if (avgEfficiency === 0) return { label: '-', color: 'gray-400', icon: Minus };
    if (avgEfficiency < 15) return { label: 'Excellent', color: 'ev-green', icon: TrendingDown };
    if (avgEfficiency < 20) return { label: 'Good', color: 'ev-blue', icon: Minus };
    if (avgEfficiency < 25) return { label: 'Average', color: 'ev-orange', icon: TrendingUp };
    return { label: 'High', color: 'ev-red', icon: TrendingUp };
  }, [avgEfficiency]);
  
  const stats = [
    {
      icon: Route,
      label: 'Distance',
      value: distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(2)} km`,
      color: 'ev-blue',
    },
    {
      icon: Zap,
      label: 'Energy',
      value: energyUsed < 0.1 ? `${(energyUsed * 1000).toFixed(0)} Wh` : `${energyUsed.toFixed(2)} kWh`,
      color: 'ev-orange',
    },
    {
      icon: Gauge,
      label: 'Efficiency',
      value: avgEfficiency > 0 ? `${avgEfficiency.toFixed(1)}` : '-',
      unit: avgEfficiency > 0 ? 'kWh/100km' : '',
      subValue: efficiencyRating.label,
      color: efficiencyRating.color,
    },
    {
      icon: Clock,
      label: 'Duration',
      value: formattedDuration,
      color: 'gray-400',
    },
  ];
  
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-3 backdrop-blur-sm border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Trip Statistics
        </h3>
        {distance > 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-${efficiencyRating.color}/20`}>
            <efficiencyRating.icon className={`w-3 h-3 text-${efficiencyRating.color}`} />
            <span className={`text-[10px] font-medium text-${efficiencyRating.color}`}>
              {efficiencyRating.label}
            </span>
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            {/* Icon */}
            <div className={`w-8 h-8 mx-auto mb-1 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
              <stat.icon className={`w-4 h-4 text-${stat.color}`} />
            </div>
            
            {/* Value */}
            <p className="text-xs font-bold text-white truncate">
              {stat.value}
            </p>
            
            {/* Unit if separate */}
            {stat.unit && (
              <p className="text-[8px] text-gray-500">
                {stat.unit}
              </p>
            )}
            
            {/* Label */}
            <p className="text-[9px] text-gray-500 uppercase mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}