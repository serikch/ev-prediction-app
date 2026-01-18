/**
 * SlopeIndicator - Visual Grade/Slope Display
 * 
 * Shows current road gradient with visual representation
 * and energy impact (uphill = consumption, downhill = regen potential)
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, BatteryCharging } from 'lucide-react';

export default function SlopeIndicator({
  slope = 0,
  maxSlope = 15,
}) {
  // Calculate visual angle (capped at Â±30 degrees for display)
  const visualAngle = useMemo(() => {
    return Math.max(-30, Math.min(30, slope * 2));
  }, [slope]);
  
  // Determine slope category and color
  const { category, color, Icon, impact } = useMemo(() => {
    if (slope > 5) {
      return { 
        category: 'MontÃ©e forte', 
        color: 'ev-red', 
        Icon: TrendingUp,
        impact: '+25-40%'
      };
    }
    if (slope > 2) {
      return { 
        category: 'MontÃ©e', 
        color: 'ev-orange', 
        Icon: TrendingUp,
        impact: '+10-25%'
      };
    }
    if (slope > -2) {
      return { 
        category: 'Plat', 
        color: 'ev-green', 
        Icon: Minus,
        impact: 'Â±0%'
      };
    }
    if (slope > -5) {
      return { 
        category: 'Descente', 
        color: 'ev-blue', 
        Icon: TrendingDown,
        impact: 'RÃ©gÃ©n.'
      };
    }
    return { 
      category: 'Descente forte', 
      color: 'ev-blue', 
      Icon: TrendingDown,
      impact: 'RÃ©gÃ©n. max'
    };
  }, [slope]);
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Pente
        </span>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${color}`} />
          <span className={`text-sm font-bold text-${color}`}>
            {slope >= 0 ? '+' : ''}{slope.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Visual Road Display */}
      <div className="relative h-24 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl overflow-hidden border border-white/10">
        {/* Sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 to-transparent" />
        
        {/* Road */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 origin-bottom-left transition-transform duration-300"
          style={{ transform: `rotate(${-visualAngle}deg) translateY(${Math.abs(visualAngle)}%)` }}
        >
          {/* Road surface */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-700 to-gray-600" />
          
          {/* Road markings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-6">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-8 h-1 bg-yellow-500/60 rounded animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
          
          {/* Road edges */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/30" />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10" />
        </div>
        
        {/* Car indicator */}
        <div 
          className="absolute left-1/2 bottom-8 -translate-x-1/2 transition-transform duration-300"
          style={{ transform: `translateX(-50%) rotate(${-visualAngle * 0.5}deg)` }}
        >
          <div className="w-6 h-4 bg-ev-green rounded-sm shadow-lg relative">
            {/* Headlights */}
            <div className="absolute -top-0.5 left-0.5 w-1 h-1 bg-yellow-300 rounded-full" />
            <div className="absolute -top-0.5 right-0.5 w-1 h-1 bg-yellow-300 rounded-full" />
          </div>
        </div>
        
        {/* Horizon line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
        
        {/* Direction Arrow */}
        {slope !== 0 && (
          <div className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center ${
            slope > 0 ? 'bg-ev-orange/20' : 'bg-ev-blue/20'
          }`}>
            {slope > 0 ? (
              <TrendingUp className="w-4 h-4 text-ev-orange" />
            ) : (
              <TrendingDown className="w-4 h-4 text-ev-blue" />
            )}
          </div>
        )}
      </div>
      
      {/* Slope Bar */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 -translate-x-1/2 z-10" />
        
        {/* Active slope indicator */}
        <div 
          className={`absolute top-0 bottom-0 bg-${color} transition-all duration-300`}
          style={{
            left: slope >= 0 ? '50%' : `${50 + (slope / maxSlope) * 50}%`,
            width: `${Math.abs(slope / maxSlope) * 50}%`,
          }}
        />
        
        {/* Position dot */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-${color} rounded-full border-2 border-white/50 shadow-lg transition-all duration-300`}
          style={{
            left: `${50 + (slope / maxSlope) * 50}%`,
            transform: 'translateX(-50%) translateY(-50%)',
          }}
        />
      </div>
      
      {/* Scale */}
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>-{maxSlope}%</span>
        <span>0%</span>
        <span>+{maxSlope}%</span>
      </div>
      
      {/* Impact Info */}
      <div className={`flex items-center justify-between p-2 rounded-lg bg-${color}/10 border border-${color}/20`}>
        <div className="flex items-center gap-2">
          {slope > 0 ? (
            <Zap className={`w-4 h-4 text-${color}`} />
          ) : slope < -2 ? (
            <BatteryCharging className={`w-4 h-4 text-${color}`} />
          ) : (
            <Minus className={`w-4 h-4 text-${color}`} />
          )}
          <span className="text-sm font-medium">{category}</span>
        </div>
        <span className={`text-sm font-bold text-${color}`}>{impact}</span>
      </div>
    </div>
  );
}
