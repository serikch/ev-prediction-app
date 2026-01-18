import React, { useMemo } from 'react';

/**
 * Circular gauge component with animated needle/arc
 */
export default function CircularGauge({
  value = 0,
  min = 0,
  max = 100,
  size = 200,
  strokeWidth = 12,
  color = '#00d26a',
  bgColor = '#1f1f1f',
  label = '',
  unit = '',
  showValue = true,
  segments = null, // Array of { value, color } for multi-color gauge
  children,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135; // Start at 7:30 position
  const endAngle = 405; // End at 4:30 position
  const totalAngle = endAngle - startAngle;

  // Calculate the arc for the value
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = (normalizedValue - min) / (max - min);
  const valueAngle = startAngle + percentage * totalAngle;

  // Arc path calculation
  const polarToCartesian = (angle) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: size / 2 + radius * Math.cos(rad),
      y: size / 2 + radius * Math.sin(rad),
    };
  };

  const describeArc = (startA, endA) => {
    const start = polarToCartesian(startA);
    const end = polarToCartesian(endA);
    const largeArcFlag = endA - startA <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Generate gradient stops for segments
  const gradientId = useMemo(() => `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  // Needle calculation
  const needleLength = radius - 15;
  const needleAngle = valueAngle;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleX = size / 2 + needleLength * Math.cos(needleRad);
  const needleY = size / 2 + needleLength * Math.sin(needleRad);

  // Tick marks
  const ticks = useMemo(() => {
    const numTicks = 5;
    const tickMarks = [];
    for (let i = 0; i <= numTicks; i++) {
      const tickAngle = startAngle + (i / numTicks) * totalAngle;
      const innerRadius = radius - 20;
      const outerRadius = radius - 8;
      const tickRad = ((tickAngle - 90) * Math.PI) / 180;
      
      tickMarks.push({
        x1: size / 2 + innerRadius * Math.cos(tickRad),
        y1: size / 2 + innerRadius * Math.sin(tickRad),
        x2: size / 2 + outerRadius * Math.cos(tickRad),
        y2: size / 2 + outerRadius * Math.sin(tickRad),
        value: min + (i / numTicks) * (max - min),
        labelX: size / 2 + (innerRadius - 15) * Math.cos(tickRad),
        labelY: size / 2 + (innerRadius - 15) * Math.sin(tickRad),
      });
    }
    return tickMarks;
  }, [min, max, radius, size, startAngle, totalAngle]);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {segments && (
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              {segments.map((seg, i) => (
                <stop
                  key={i}
                  offset={`${(i / (segments.length - 1)) * 100}%`}
                  stopColor={seg.color}
                />
              ))}
            </linearGradient>
          )}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={describeArc(startAngle, valueAngle)}
          fill="none"
          stroke={segments ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="gauge-circle"
          style={{
            filter: 'url(#glow)',
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="#444"
              strokeWidth="2"
            />
            <text
              x={tick.labelX}
              y={tick.labelY}
              fill="#666"
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Math.round(tick.value)}
            </text>
          </g>
        ))}

        {/* Needle */}
        <line
          x1={size / 2}
          y1={size / 2}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          className="gauge-needle"
          style={{
            filter: 'url(#glow)',
          }}
        />

        {/* Center circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="8"
          fill={color}
          style={{
            filter: 'url(#glow)',
          }}
        />
      </svg>

      {/* Value display */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: size * 0.15 }}>
          <span className="text-4xl font-bold number-display" style={{ color }}>
            {typeof value === 'number' ? value.toFixed(0) : value}
          </span>
          {unit && (
            <span className="text-sm text-gray-400 mt-1">{unit}</span>
          )}
          {label && (
            <span className="text-xs text-gray-500 mt-2 uppercase tracking-wider">{label}</span>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
