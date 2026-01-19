/**
 * AccelerationBar - Horizontal Acceleration Indicator
 * 
 * FIXED VERSION:
 * - All text in English
 * - Shows current acceleration/deceleration with eco zones
 * - Negative = braking/regen, Positive = acceleration
 */
import { useMemo } from 'react';
import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react';

export default function AccelerationBar({ 
  acceleration = 0,
  maxAccel = 3,
  maxDecel = -4,
}) {
  // Calculate position (-100% to +100%)
  const position = useMemo(() => {
    if (acceleration >= 0) {
      return Math.min((acceleration / maxAccel) * 50, 50);
    } else {
      return Math.max((acceleration / Math.abs(maxDecel)) * -50, -50);
    }
  }, [acceleration, maxAccel, maxDecel]);
  
  // Determine color based on acceleration
  const accelColor = useMemo(() => {
    const absAccel = Math.abs(acceleration);
    if (absAccel < 0.3) return 'ev-green'; // Eco zone
    if (absAccel < 1.0) return 'ev-blue';  // Moderate
    if (absAccel < 2.0) return 'ev-orange'; // High
    return 'ev-red'; // Very high
  }, [acceleration]);
  
  // Eco zone check
  const isEco = Math.abs(acceleration) < 0.3 && Math.abs(acceleration) > 0.01;
  
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Acceleration
          </span>
          {isEco && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-ev-green/20 rounded-full">
              <Leaf className="w-3 h-3 text-ev-green" />
              <span className="text-[10px] font-medium text-ev-green">ECO</span>
            </div>
          )}
        </div>
        <span className={`text-sm font-bold text-${accelColor}`}>
          {acceleration >= 0 ? '+' : ''}{acceleration.toFixed(2)} m/s²
        </span>
      </div>
      
      {/* Bar Container */}
      <div className="relative h-8">
        {/* Background Track */}
        <div className="absolute inset-0 flex">
          {/* Deceleration side (left) */}
          <div className="flex-1 bg-gradient-to-l from-transparent via-ev-blue/10 to-ev-red/10 rounded-l-full" />
          {/* Acceleration side (right) */}
          <div className="flex-1 bg-gradient-to-r from-transparent via-ev-blue/10 to-ev-red/10 rounded-r-full" />
        </div>
        
        {/* Eco Zone Highlight (center) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-16 -translate-x-1/2 bg-ev-green/10 rounded-lg border border-ev-green/20" />
        
        {/* Center Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
        
        {/* Active Bar */}
        <div 
          className="absolute top-1 bottom-1 transition-all duration-150"
          style={{
            left: position >= 0 ? '50%' : `calc(50% + ${position}%)`,
            width: `${Math.abs(position)}%`,
            transform: position >= 0 ? 'none' : 'none',
          }}
        >
          <div className={`h-full bg-${accelColor} rounded-full opacity-80`} />
        </div>
        
        {/* Indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-150"
          style={{
            left: `calc(50% + ${position}%)`,
            transform: 'translateX(-50%) translateY(-50%)',
          }}
        >
          <div className={`w-4 h-4 bg-${accelColor} rounded-full shadow-lg shadow-${accelColor}/50 border-2 border-white/50`} />
        </div>
        
        {/* Direction Arrows */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <ArrowLeft className={`w-4 h-4 ${acceleration < -0.5 ? 'text-ev-blue' : 'text-gray-600'}`} />
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <ArrowRight className={`w-4 h-4 ${acceleration > 0.5 ? 'text-ev-orange' : 'text-gray-600'}`} />
        </div>
      </div>
      
      {/* Scale */}
      <div className="flex justify-between text-[10px] text-gray-600 px-1">
        <span>{maxDecel}</span>
        <span>-1</span>
        <span className="text-ev-green">0</span>
        <span>+1</span>
        <span>+{maxAccel}</span>
      </div>
      
      {/* Status Text */}
      <div className="text-center text-xs text-gray-500">
        {acceleration < -1.5 ? (
          <span className="text-ev-blue">Hard braking - Max regeneration</span>
        ) : acceleration < -0.3 ? (
          <span className="text-ev-blue">Decelerating - Regen active</span>
        ) : acceleration < 0.3 ? (
          <span className="text-ev-green">Smooth driving - Eco mode</span>
        ) : acceleration < 1.0 ? (
          <span className="text-ev-orange">Moderate acceleration</span>
        ) : (
          <span className="text-ev-red">Strong acceleration - High consumption</span>
        )}
      </div>
    </div>
  );
}