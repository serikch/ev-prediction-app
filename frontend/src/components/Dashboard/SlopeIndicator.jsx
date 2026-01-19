/**
 * SlopeIndicator - Visual Grade/Slope Display
 * 
 * FIXED VERSION:
 * - All text in English
 * - Removed confusing car/battery graphic
 * - Cleaner, more intuitive visual
 * - Shows energy impact clearly
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, BatteryCharging, Mountain } from 'lucide-react';

export default function SlopeIndicator({
  slope = 0,
  maxSlope = 15,
}) {
  // Calculate visual angle (capped at ±30 degrees for display)
  const visualAngle = useMemo(() => {
    return Math.max(-30, Math.min(30, slope * 2));
  }, [slope]);
  
  // Determine slope category and color
  const { category, color, Icon, impact } = useMemo(() => {
    if (slope > 5) {
      return { 
        category: 'Steep Uphill', 
        color: 'ev-red', 
        Icon: TrendingUp,
        impact: '+25-40%'
      };
    }
    if (slope > 2) {
      return { 
        category: 'Uphill', 
        color: 'ev-orange', 
        Icon: TrendingUp,
        impact: '+10-25%'
      };
    }
    if (slope > -2) {
      return { 
        category: 'Flat', 
        color: 'ev-green', 
        Icon: Minus,
        impact: '±0%'
      };
    }
    if (slope > -5) {
      return { 
        category: 'Downhill', 
        color: 'ev-blue', 
        Icon: TrendingDown,
        impact: 'Regen'
      };
    }
    return { 
      category: 'Steep Downhill', 
      color: 'ev-blue', 
      Icon: TrendingDown,
      impact: 'Max Regen'
    };
  }, [slope]);
  
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Grade
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${color}`} />
          <span className={`text-sm font-bold text-${color}`}>
            {slope >= 0 ? '+' : ''}{slope.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Visual Slope Display - Clean version */}
      <div className="relative h-16 bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-xl overflow-hidden border border-white/5">
        {/* Background gradient showing slope direction */}
        <div 
          className={`absolute inset-0 transition-all duration-300 ${
            slope > 0 
              ? 'bg-gradient-to-r from-ev-orange/20 to-transparent' 
              : slope < 0 
              ? 'bg-gradient-to-l from-ev-blue/20 to-transparent'
              : ''
          }`}
        />
        
        {/* Slope line visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`w-3/4 h-1 bg-${color} rounded-full transition-transform duration-300 shadow-lg`}
            style={{ 
              transform: `rotate(${-visualAngle}deg)`,
              boxShadow: `0 0 10px var(--color-${color})`
            }}
          />
        </div>
        
        {/* Direction indicator */}
        <div className={`absolute top-2 ${slope > 0 ? 'right-2' : slope < 0 ? 'left-2' : 'left-1/2 -translate-x-1/2'}`}>
          <div className={`w-8 h-8 rounded-full bg-${color}/20 flex items-center justify-center`}>
            <Icon className={`w-4 h-4 text-${color}`} />
          </div>
        </div>
        
        {/* Horizon reference line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
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
      <div className="flex justify-between text-[10px] text-gray-600 px-1">
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
          <span className="text-xs font-medium">{category}</span>
        </div>
        <span className={`text-xs font-bold text-${color}`}>{impact}</span>
      </div>
    </div>
  );
}