/**
 * TripStats - Trip Statistics Display
 * 
 * Shows cumulative trip statistics:
 * - Distance traveled
 * - Energy consumed
 * - Average efficiency
 * - Trip duration
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
    if (avgEfficiency < 20) return { label: 'Bon', color: 'ev-blue', icon: Minus };
    if (avgEfficiency < 25) return { label: 'Moyen', color: 'ev-orange', icon: TrendingUp };
    return { label: 'Ã‰levÃ©', color: 'ev-red', icon: TrendingUp };
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
      label: 'Ã‰nergie',
      value: energyUsed < 0.1 ? `${(energyUsed * 1000).toFixed(0)} Wh` : `${energyUsed.toFixed(2)} kWh`,
      color: 'ev-orange',
    },
    {
      icon: Gauge,
      label: 'EfficacitÃ©',
      value: avgEfficiency > 0 ? `${avgEfficiency.toFixed(1)} kWh/100km` : '-',
      subValue: efficiencyRating.label,
      color: efficiencyRating.color,
    },
    {
      icon: Clock,
      label: 'DurÃ©e',
      value: formattedDuration,
      color: 'gray-400',
    },
  ];
  
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 backdrop-blur-sm border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Statistiques du trajet
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
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            {/* Icon */}
            <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
            
            {/* Value */}
            <p className="text-sm font-bold text-white truncate">
              {stat.value}
            </p>
            
            {/* Label */}
            <p className="text-[10px] text-gray-500 uppercase">
              {stat.label}
            </p>
            
            {/* Sub Value (optional) */}
            {stat.subValue && (
              <p className={`text-[10px] text-${stat.color} mt-0.5`}>
                {stat.subValue}
              </p>
            )}
          </div>
        ))}
      </div>
      
      {/* Progress Bar (if trip in progress) */}
      {distance > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Progression</span>
            <span>{((energyUsed / (distance || 1)) * 100).toFixed(1)} Wh/km</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-${efficiencyRating.color} to-${efficiencyRating.color}/50 transition-all duration-500`}
              style={{ width: `${Math.min(100, distance * 2)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
