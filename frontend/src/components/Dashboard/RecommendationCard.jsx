/**
 * RecommendationCard - Contextual Driving Advice
 * 
 * Provides real-time driving recommendations based on:
 * - Current power consumption
 * - Speed
 * - Slope/grade
 * - Acceleration patterns
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
  Snowflake,
  Sun
} from 'lucide-react';

// Recommendation types with styling
const RECOMMENDATION_STYLES = {
  success: {
    bg: 'from-ev-green/20 to-ev-green/5',
    border: 'border-ev-green/30',
    icon: 'bg-ev-green/20 text-ev-green',
    text: 'text-ev-green',
  },
  warning: {
    bg: 'from-ev-orange/20 to-ev-orange/5',
    border: 'border-ev-orange/30',
    icon: 'bg-ev-orange/20 text-ev-orange',
    text: 'text-ev-orange',
  },
  danger: {
    bg: 'from-ev-red/20 to-ev-red/5',
    border: 'border-ev-red/30',
    icon: 'bg-ev-red/20 text-ev-red',
    text: 'text-ev-red',
  },
  info: {
    bg: 'from-ev-blue/20 to-ev-blue/5',
    border: 'border-ev-blue/30',
    icon: 'bg-ev-blue/20 text-ev-blue',
    text: 'text-ev-blue',
  },
};

export default function RecommendationCard({
  power = 0,
  speed = 0,
  slope = 0,
  acceleration = 0,
  efficiency = 0,
  temperature = 18,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [recentRecommendations, setRecentRecommendations] = useState([]);
  
  // Generate recommendation based on current conditions
  const recommendation = useMemo(() => {
    // Priority 1: Regeneration active (good!)
    if (power < -10) {
      return {
        type: 'info',
        icon: BatteryCharging,
        title: 'RÃ©gÃ©nÃ©ration active',
        message: `${Math.abs(power).toFixed(0)} kW rÃ©cupÃ©rÃ©s. Maintenez une dÃ©cÃ©lÃ©ration progressive.`,
        tip: 'La rÃ©gÃ©nÃ©ration maximale est atteinte avec un freinage doux et anticipÃ©.',
        savings: Math.abs(power) * 0.7, // Estimated recovery
      };
    }
    
    // Priority 2: Very high consumption
    if (power > 80 && speed > 100) {
      return {
        type: 'danger',
        icon: AlertTriangle,
        title: 'Consommation trÃ¨s Ã©levÃ©e',
        message: `${power.toFixed(0)} kW consommÃ©s. RÃ©duisez Ã  90 km/h pour Ã©conomiser ~25%.`,
        tip: 'La rÃ©sistance aÃ©rodynamique augmente au carrÃ© de la vitesse.',
        savings: power * 0.25,
      };
    }
    
    // Priority 3: Steep uphill
    if (slope > 5 && power > 40) {
      return {
        type: 'warning',
        icon: TrendingDown,
        title: `MontÃ©e ${slope.toFixed(1)}%`,
        message: 'Maintenez une vitesse stable, Ã©vitez les accÃ©lÃ©rations.',
        tip: 'Anticipez la descente pour rÃ©cupÃ©rer de l\'Ã©nergie.',
        savings: power * 0.15,
      };
    }
    
    // Priority 4: Aggressive acceleration
    if (acceleration > 2.0) {
      return {
        type: 'warning',
        icon: Gauge,
        title: 'AccÃ©lÃ©ration forte',
        message: 'Une accÃ©lÃ©ration plus douce Ã©conomise 15-20% d\'Ã©nergie.',
        tip: 'Visualisez l\'accÃ©lÃ©ration comme un compte-gouttes d\'Ã©nergie.',
        savings: power * 0.18,
      };
    }
    
    // Priority 5: High speed consumption
    if (speed > 120 && power > 50) {
      return {
        type: 'warning',
        icon: Wind,
        title: 'Vitesse Ã©levÃ©e',
        message: `Ã€ ${speed.toFixed(0)} km/h, rÃ©duire Ã  110 km/h Ã©conomise ~15%.`,
        tip: 'L\'Ã©nergie aÃ©rodynamique triple entre 100 et 150 km/h.',
        savings: power * 0.15,
      };
    }
    
    // Priority 6: Moderate acceleration
    if (acceleration > 1.0 && power > 30) {
      return {
        type: 'warning',
        icon: Zap,
        title: 'AccÃ©lÃ©ration modÃ©rÃ©e',
        message: 'Anticipez le trafic pour une conduite plus fluide.',
        tip: 'Chaque accÃ©lÃ©ration suivie d\'un freinage perd de l\'Ã©nergie.',
        savings: power * 0.1,
      };
    }
    
    // Priority 7: Potential regen opportunity
    if (slope < -3 && speed > 40 && power > 0) {
      return {
        type: 'info',
        icon: ArrowDown,
        title: 'Descente dÃ©tectÃ©e',
        message: 'Levez le pied pour activer la rÃ©gÃ©nÃ©ration.',
        tip: 'Anticipez la prochaine montÃ©e ou feu rouge.',
        savings: 5,
      };
    }
    
    // Priority 8: Good efficiency
    if (efficiency < 20 && efficiency > 0 && speed > 30) {
      return {
        type: 'success',
        icon: Leaf,
        title: 'Conduite Ã©co-efficace',
        message: `${efficiency.toFixed(1)} kWh/100km - Excellente efficacitÃ© !`,
        tip: 'Continuez ainsi, vous Ãªtes dans la zone optimale.',
        savings: 0,
      };
    }
    
    // Priority 9: Very good driving
    if (Math.abs(acceleration) < 0.5 && speed > 30 && speed < 100) {
      return {
        type: 'success',
        icon: ThumbsUp,
        title: 'Conduite optimale',
        message: 'Vitesse et accÃ©lÃ©ration dans la zone idÃ©ale.',
        tip: 'Maintenez cette conduite fluide et anticipÃ©e.',
        savings: 0,
      };
    }
    
    // Default: neutral state
    return {
      type: 'success',
      icon: Leaf,
      title: 'PrÃªt Ã  rouler',
      message: 'Le systÃ¨me analyse votre conduite en temps rÃ©el.',
      tip: 'Les recommandations apparaÃ®tront selon les conditions.',
      savings: 0,
    };
  }, [power, speed, slope, acceleration, efficiency, temperature]);
  
  // Track recent recommendations
  useEffect(() => {
    if (recommendation.title !== recentRecommendations[0]?.title) {
      setRecentRecommendations(prev => [
        { ...recommendation, timestamp: Date.now() },
        ...prev.slice(0, 4)
      ]);
    }
  }, [recommendation]);
  
  const style = RECOMMENDATION_STYLES[recommendation.type];
  const Icon = recommendation.icon;
  
  return (
    <div className={`rounded-2xl border ${style.border} overflow-hidden`}>
      {/* Main Recommendation */}
      <div 
        className={`bg-gradient-to-br ${style.bg} p-4 cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-start gap-4">
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
                <span className="text-xs font-medium px-2 py-0.5 bg-white/10 rounded-full">
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
          <div className={`w-8 h-1 rounded-full bg-white/20 ${showDetails ? 'opacity-0' : 'animate-pulse'}`} />
        </div>
      </div>
      
      {/* Details Section */}
      {showDetails && (
        <div className="bg-black/20 p-4 space-y-4 animate-slide-up">
          {/* Tip */}
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              ðŸ’¡
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">CONSEIL</p>
              <p className="text-sm text-gray-300">{recommendation.tip}</p>
            </div>
          </div>
          
          {/* Current Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatMini label="Puiss." value={`${power.toFixed(0)} kW`} />
            <StatMini label="Vitesse" value={`${speed.toFixed(0)} km/h`} />
            <StatMini label="Pente" value={`${slope >= 0 ? '+' : ''}${slope.toFixed(1)}%`} />
            <StatMini label="AccÃ©l." value={`${acceleration.toFixed(1)} m/sÂ²`} />
          </div>
          
          {/* Recent Recommendations */}
          {recentRecommendations.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">HISTORIQUE RÃ‰CENT</p>
              <div className="space-y-1">
                {recentRecommendations.slice(1, 4).map((rec, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2 text-xs text-gray-500"
                  >
                    <div className={`w-2 h-2 rounded-full bg-${
                      rec.type === 'success' ? 'ev-green' :
                      rec.type === 'warning' ? 'ev-orange' :
                      rec.type === 'danger' ? 'ev-red' : 'ev-blue'
                    }`} />
                    <span className="truncate">{rec.title}</span>
                    <span className="ml-auto opacity-50">
                      {formatTimeAgo(rec.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

// Format time ago
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}
