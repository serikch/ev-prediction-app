/**
 * SpeedHistory Chart Component
 * 
 * FIXED VERSION:
 * - All text in English
 * - Real-time chart showing actual speed vs recommended speed
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
  height = 120,
  showRecommended = true 
}) {
  // Process data for chart
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    const startTime = data[0]?.time || 0;
    
    return data.map((point) => ({
      ...point,
      timeLabel: Math.round((point.time - startTime) / 1000),
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
        className="flex items-center justify-center text-gray-500 text-xs"
        style={{ height }}
      >
        Waiting for data...
      </div>
    );
  }
  
  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    
    const actualSpeed = payload.find(p => p.dataKey === 'value');
    const recSpeed = payload.find(p => p.dataKey === 'recommended');
    
    return (
      <div className="bg-ev-dark/95 border border-white/10 rounded-lg p-2 shadow-xl">
        <p className="text-[10px] text-gray-400 mb-1">T+{label}s</p>
        
        {actualSpeed && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-ev-blue rounded-full" />
              <span className="text-[10px] text-gray-400">Actual</span>
            </div>
            <span className="text-xs font-medium text-white">
              {Math.round(actualSpeed.value)} km/h
            </span>
          </div>
        )}
        
        {recSpeed && (
          <div className="flex items-center justify-between gap-3 mt-0.5">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-ev-green rounded-full" />
              <span className="text-[10px] text-gray-400">Optimal</span>
            </div>
            <span className="text-xs font-medium text-ev-green">
              {Math.round(recSpeed.value)} km/h
            </span>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div>
      {/* Current Speed Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xl font-bold text-white">
              {Math.round(currentSpeed)}
            </span>
            <span className="text-xs text-gray-400 ml-1">km/h</span>
          </div>
          
          {showRecommended && (
            <div className="flex items-center gap-1 text-[10px]">
              <div className="w-2 h-0.5 bg-ev-green rounded" />
              <span className="text-gray-400">
                Optimal: {Math.round(recommendedSpeed)}
              </span>
            </div>
          )}
        </div>
        
        {/* Speed Difference Badge */}
        {Math.abs(speedDiff) > 5 && (
          <div className={`
            px-2 py-0.5 rounded-full text-[10px] font-medium
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
            <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00a8ff" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#00a8ff" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00a8ff" stopOpacity={0} />
            </linearGradient>
            
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
            tick={{ fontSize: 9, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(value) => `${value}s`}
            interval="preserveStartEnd"
          />
          
          <YAxis 
            domain={domain}
            tick={{ fontSize: 9, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
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
          
          <Area
            type="monotone"
            dataKey="value"
            stroke="#00a8ff"
            strokeWidth={2}
            fill="url(#speedGradient)"
            fillOpacity={1}
            animationDuration={300}
            dot={false}
          />
          
          <ReferenceLine 
            y={130} 
            stroke="rgba(255,59,48,0.3)" 
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1 text-[9px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-ev-blue rounded" />
          <span>Actual speed</span>
        </div>
        {showRecommended && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-ev-green rounded opacity-50" />
            <span>Optimal speed</span>
          </div>
        )}
      </div>
    </div>
  );
}