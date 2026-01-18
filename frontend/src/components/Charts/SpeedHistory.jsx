/**
 * SpeedHistory Chart Component
 * 
 * Real-time chart showing actual speed vs recommended speed over time.
 * Uses Recharts for smooth animations.
 */
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

export default function SpeedHistory({ 
  data = [], 
  height = 150,
  showRecommended = true 
}) {
  // Process data for chart
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    const startTime = data[0]?.time || 0;
    
    return data.map((point, index) => ({
      ...point,
      timeLabel: Math.round((point.time - startTime) / 1000), // seconds from start
      displayTime: formatTime((point.time - startTime) / 1000),
    }));
  }, [data]);
  
  // Calculate domain
  const domain = useMemo(() => {
    if (!data.length) return [0, 150];
    
    const allValues = data.flatMap(d => [d.value, d.recommended].filter(Boolean));
    const max = Math.max(...allValues, 50);
    const min = Math.min(...allValues, 0);
    
    return [Math.floor(min / 10) * 10, Math.ceil(max / 10) * 10 + 10];
  }, [data]);
  
  // Current values
  const currentSpeed = data.length > 0 ? data[data.length - 1].value : 0;
  const recommendedSpeed = data.length > 0 ? data[data.length - 1].recommended : 80;
  const speedDiff = currentSpeed - recommendedSpeed;
  
  if (!data.length) {
    return (
      <div 
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height }}
      >
        En attente de donnÃ©es...
      </div>
    );
  }
  
  return (
    <div>
      {/* Current Speed Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold text-white">
              {Math.round(currentSpeed)}
            </span>
            <span className="text-sm text-gray-400 ml-1">km/h</span>
          </div>
          
          {showRecommended && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-0.5 bg-ev-blue rounded" />
              <span className="text-gray-400">
                Optimal: {Math.round(recommendedSpeed)} km/h
              </span>
            </div>
          )}
        </div>
        
        {/* Speed Difference Badge */}
        {Math.abs(speedDiff) > 5 && (
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${speedDiff > 0 
              ? 'bg-ev-orange/20 text-ev-orange' 
              : 'bg-ev-green/20 text-ev-green'
            }
          `}>
            {speedDiff > 0 ? '+' : ''}{Math.round(speedDiff)} km/h
          </div>
        )}
      </div>
      
      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <defs>
            {/* Gradient for actual speed */}
            <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00a8ff" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#00a8ff" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00a8ff" stopOpacity={0} />
            </linearGradient>
            
            {/* Gradient for recommended speed */}
            <linearGradient id="recommendedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d26a" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00d26a" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.05)" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="timeLabel"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(value) => `${value}s`}
            interval="preserveStartEnd"
          />
          
          <YAxis 
            domain={domain}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Recommended Speed Line */}
          {showRecommended && (
            <Area
              type="monotone"
              dataKey="recommended"
              stroke="#00d26a"
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="url(#recommendedGradient)"
              fillOpacity={1}
              animationDuration={300}
              dot={false}
            />
          )}
          
          {/* Actual Speed Area */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#00a8ff"
            strokeWidth={2}
            fill="url(#speedGradient)"
            fillOpacity={1}
            animationDuration={300}
            dot={false}
            activeDot={{ 
              r: 4, 
              fill: '#00a8ff',
              stroke: '#fff',
              strokeWidth: 2 
            }}
          />
          
          {/* Speed limit reference line (example: 130 km/h) */}
          <ReferenceLine 
            y={130} 
            stroke="rgba(255,59,48,0.3)" 
            strokeDasharray="5 5"
            label={{ 
              value: 'Limite', 
              position: 'right',
              fill: '#ff3b30',
              fontSize: 10 
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-ev-blue rounded" />
          <span>Vitesse rÃ©elle</span>
        </div>
        {showRecommended && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-ev-green rounded border-dashed" style={{ borderStyle: 'dashed' }} />
            <span>Vitesse optimale</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  
  const actualSpeed = payload.find(p => p.dataKey === 'value');
  const recommendedSpeed = payload.find(p => p.dataKey === 'recommended');
  
  return (
    <div className="bg-ev-dark/95 border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-2">T+{label}s</p>
      
      {actualSpeed && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-ev-blue rounded-full" />
            <span className="text-xs text-gray-400">RÃ©elle</span>
          </div>
          <span className="text-sm font-medium text-white">
            {Math.round(actualSpeed.value)} km/h
          </span>
        </div>
      )}
      
      {recommendedSpeed && (
        <div className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-ev-green rounded-full" />
            <span className="text-xs text-gray-400">Optimale</span>
          </div>
          <span className="text-sm font-medium text-ev-green">
            {Math.round(recommendedSpeed.value)} km/h
          </span>
        </div>
      )}
      
      {/* Difference */}
      {actualSpeed && recommendedSpeed && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Ã‰cart</span>
            <span className={`text-xs font-medium ${
              actualSpeed.value > recommendedSpeed.value 
                ? 'text-ev-orange' 
                : 'text-ev-green'
            }`}>
              {actualSpeed.value > recommendedSpeed.value ? '+' : ''}
              {Math.round(actualSpeed.value - recommendedSpeed.value)} km/h
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Format time helper
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
