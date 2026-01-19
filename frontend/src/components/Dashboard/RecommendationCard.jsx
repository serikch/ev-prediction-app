/**
 * RecommendationCard - Contextual Driving Advice
 * 
 * FIXED VERSION:
 * - All text in English
 * - More prominent display
 * - Cleaner layout for mobile
 */
import { useMemo, useState, useEffect } from 'react';
import { 
  Leaf, 
  AlertTriangle, 
  TrendingDown, 
  Gauge,
  Wind,
  Zap,
  ThumbsUp,
  ArrowDown,
  BatteryCharging,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Recommendation types with styling
const RECOMMENDATION_STYLES = {
  success: {
    bg: 'from-ev-green/30 to-ev-green/10',
    border: 'border-ev-green/40',
    icon: 'bg-ev-green/30 text-ev-green',
    text: 'text-ev-green',
    glow: 'shadow-ev-green/20',
  },
  warning: {
    bg: 'from-ev-orange/30 to-ev-orange/10',
    border: 'border-ev-orange/40',
    icon: 'bg-ev-orange/30 text-ev-orange',
    text: 'text-ev-orange',
    glow: 'shadow-ev-orange/20',
  },
  danger: {
    bg: 'from-ev-red/30 to-ev-red/10',
    border: 'border-ev-red/40',
    icon: 'bg-ev-red/30 text-ev-red',
    text: 'text-ev-red',
    glow: 'shadow-ev-red/20',
  },
  info: {
    bg: 'from-ev-blue/30 to-ev-blue/10',
    border: 'border-ev-blue/40',
    icon: 'bg-ev-blue/30 text-ev-blue',
    text: 'text-ev-blue',
    glow: 'shadow-ev-blue/20',
  },
};

export default function RecommendationCard({
  power = 0,
  speed = 0,
  slope = 0,
  acceleration = 0,
  efficiency = 0,
  temperature = 18,
  compact = false, // New prop for compact mode at top of screen
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Generate recommendation based on current conditions
  const recommendation = useMemo(() => {
    // Priority 1: Regeneration active (good!)
    if (power < -10) {
      return {
        type: 'info',
        icon: BatteryCharging,
        title: 'Regeneration Active',
        message: `${Math.abs(power).toFixed(0)} kW recovered. Maintain gradual deceleration.`,
        tip: 'Maximum regeneration is achieved with smooth, anticipated braking.',
        savings: Math.abs(power) * 0.7,
      };
    }
    
    // Priority 2: Very high consumption
    if (power > 80 && speed > 100) {
      return {
        type: 'danger',
        icon: AlertTriangle,
        title: 'Very High Consumption',
        message: `${power.toFixed(0)} kW consumed. Reduce to 90 km/h to save ~25%.`,
        tip: 'Aerodynamic drag increases with the square of speed.',
        savings: power * 0.25,
      };
    }
    
    // Priority 3: Steep uphill
    if (slope > 5 && power > 40) {
      return {
        type: 'warning',
        icon: TrendingDown,
        title: `Uphill ${slope.toFixed(1)}%`,
        message: 'Maintain steady speed, avoid accelerations.',
        tip: 'Anticipate the downhill to recover energy.',
        savings: power * 0.15,
      };
    }
    
    // Priority 4: Aggressive acceleration
    if (acceleration > 2.0) {
      return {
        type: 'warning',
        icon: Gauge,
        title: 'Strong Acceleration',
        message: 'Gentler acceleration saves 15-20% energy.',
        tip: 'Think of acceleration as an energy tap.',
        savings: power * 0.18,
      };
    }
    
    // Priority 5: High speed consumption
    if (speed > 120 && power > 50) {
      return {
        type: 'warning',
        icon: Wind,
        title: 'High Speed',
        message: `At ${speed.toFixed(0)} km/h, reducing to 110 km/h saves ~15%.`,
        tip: 'Aerodynamic energy triples between 100 and 150 km/h.',
        savings: power * 0.15,
      };
    }
    
    // Priority 6: Moderate acceleration
    if (acceleration > 1.0 && power > 30) {
      return {
        type: 'warning',
        icon: Zap,
        title: 'Moderate Acceleration',
        message: 'Anticipate traffic for smoother driving.',
        tip: 'Every acceleration followed by braking wastes energy.',
        savings: power * 0.1,
      };
    }
    
    // Priority 7: Potential regen opportunity
    if (slope < -3 && speed > 40 && power > 0) {
      return {
        type: 'info',
        icon: ArrowDown,
        title: 'Downhill Detected',
        message: 'Lift off the accelerator to activate regeneration.',
        tip: 'Anticipate the next uphill or traffic light.',
        savings: 5,
      };
    }
    
    // Priority 8: Good efficiency
    if (efficiency < 20 && efficiency > 0 && speed > 30) {
      return {
        type: 'success',
        icon: Leaf,
        title: 'Eco-Efficient Driving',
        message: `${efficiency.toFixed(1)} kWh/100km - Excellent efficiency!`,
        tip: 'Keep going, you are in the optimal zone.',
        savings: 0,
      };
    }
    
    // Priority 9: Very good driving
    if (Math.abs(acceleration) < 0.5 && speed > 30 && speed < 100) {
      return {
        type: 'success',
        icon: ThumbsUp,
        title: 'Optimal Driving',
        message: 'Speed and acceleration in the ideal zone.',
        tip: 'Maintain this smooth, anticipated driving style.',
        savings: 0,
      };
    }
    
    // Default: neutral state
    return {
      type: 'success',
      icon: Leaf,
      title: 'Ready to Drive',
      message: 'The system analyzes your driving in real-time.',
      tip: 'Recommendations will appear based on conditions.',
      savings: 0,
    };
  }, [power, speed, slope, acceleration, efficiency, temperature]);
  
  const style = RECOMMENDATION_STYLES[recommendation.type];
  const Icon = recommendation.icon;
  
  // Compact mode for top of screen - now includes tip!
  if (compact) {
    return (
      <div className={`rounded-xl border-2 ${style.border} overflow-hidden shadow-lg ${style.glow}`}>
        <div className={`bg-gradient-to-r ${style.bg} p-3`}>
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl ${style.icon} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className={`font-bold ${style.text}`}>
                  {recommendation.title}
                </h3>
                {recommendation.savings > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 ${style.text}`}>
                    -{recommendation.savings.toFixed(0)} kW
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-200">
                {recommendation.message}
              </p>
              {/* Tip - now visible in compact mode! */}
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                <span>💡</span>
                <span className="line-clamp-1">{recommendation.tip}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Full mode with expandable details
  return (
    <div className={`rounded-xl border-2 ${style.border} overflow-hidden shadow-lg ${style.glow}`}>
      {/* Main Recommendation */}
      <div 
        className={`bg-gradient-to-br ${style.bg} p-4 cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl ${style.icon} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className={`font-bold ${style.text}`}>
                {recommendation.title}
              </h3>
              {recommendation.savings > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 bg-white/10 rounded-full ${style.text}`}>
                  -{recommendation.savings.toFixed(0)} kW
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300">
              {recommendation.message}
            </p>
          </div>
        </div>
        
        {/* Expand indicator */}
        <div className="flex justify-center mt-2">
          {showDetails ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 animate-bounce" />
          )}
        </div>
      </div>
      
      {/* Details Section */}
      {showDetails && (
        <div className="bg-black/30 p-3 space-y-3 animate-slide-up">
          {/* Tip */}
          <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-0.5">TIP</p>
              <p className="text-xs text-gray-300">{recommendation.tip}</p>
            </div>
          </div>
          
          {/* Current Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatMini label="Power" value={`${power.toFixed(0)} kW`} />
            <StatMini label="Speed" value={`${speed.toFixed(0)} km/h`} />
            <StatMini label="Grade" value={`${slope >= 0 ? '+' : ''}${slope.toFixed(1)}%`} />
            <StatMini label="Accel" value={`${acceleration.toFixed(1)} m/s²`} />
          </div>
        </div>
      )}
    </div>
  );
}

// Mini stat display
function StatMini({ label, value }) {
  return (
    <div className="text-center p-2 bg-white/5 rounded-lg">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="text-xs font-bold text-white">{value}</p>
    </div>
  );
}