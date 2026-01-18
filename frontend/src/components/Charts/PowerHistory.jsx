/**
 * PowerHistory - Real-time Power Consumption Chart
 * 
 * Shows power consumption over the last 60 seconds.
 * Positive = consumption, Negative = regeneration
 */
import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Tooltip
} from 'recharts';

export default function PowerHistory({ data = [] }) {
  // Process data for chart
  const chartData = useMemo(() => {
    if (data.length === 0) {
      // Generate placeholder data
      return Array(30).fill(0).map((_, i) => ({
        time: i,
        value: 0,
        optimal: 0,
      }));
    }
    
    const now = Date.now();
    return data.map((point, index) => ({
      time: Math.round((point.time - now) / 1000), // Seconds ago
      value: point.value,
      optimal: point.optimal || point.value * 0.8,
    }));
  }, [data]);
  
  // Calculate min/max for Y axis
  const { minY, maxY } = useMemo(() => {
    if (data.length === 0) return { minY: -50, maxY: 100 };
    
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      minY: Math.floor(Math.min(min, -20) / 10) * 10,
      maxY: Math.ceil(Math.max(max, 50) / 10) * 10,
    };
  }, [data]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const value = payload[0]?.value || 0;
      return (
        <div className="bg-ev-dark/90 border border-white/20 rounded-lg px-3 py-2 text-xs">
          <p className={`font-bold ${value > 0 ? 'text-ev-orange' : 'text-ev-blue'}`}>
            {value > 0 ? '+' : ''}{value.toFixed(1)} kW
          </p>
          <p className="text-gray-400">
            {value > 0 ? 'Consommation' : 'RÃ©gÃ©nÃ©ration'}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="powerGradientPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff9500" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ff9500" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="powerGradientNegative" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="#00a8ff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00a8ff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          {/* Grid */}
          <XAxis 
            dataKey="time" 
            stroke="#333"
            tick={{ fill: '#666', fontSize: 10 }}
            tickFormatter={(v) => `${v}s`}
            axisLine={{ stroke: '#333' }}
          />
          <YAxis 
            domain={[minY, maxY]}
            stroke="#333"
            tick={{ fill: '#666', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
            axisLine={{ stroke: '#333' }}
          />
          
          {/* Zero reference line */}
          <ReferenceLine 
            y={0} 
            stroke="#00d26a" 
            strokeDasharray="3 3" 
            strokeWidth={1}
          />
          
          {/* High consumption warning line */}
          <ReferenceLine 
            y={50} 
            stroke="#ff9500" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Area fill */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill="url(#powerGradientPositive)"
            fillOpacity={1}
            isAnimationActive={false}
          />
          
          {/* Main power line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#ff9500"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          
          {/* Optimal power line */}
          <Line
            type="monotone"
            dataKey="optimal"
            stroke="#00d26a"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            opacity={0.5}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-ev-orange rounded" />
          <span className="text-gray-500">Puissance actuelle</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-ev-green rounded border-dashed" style={{ borderTop: '1px dashed #00d26a' }} />
          <span className="text-gray-500">Optimal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-ev-blue rounded" />
          <span className="text-gray-500">RÃ©gÃ©nÃ©ration</span>
        </div>
      </div>
    </div>
  );
}
