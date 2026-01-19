/**
 * CircularGauge - Clean automotive-style speedometer
 * 
 * Modern design with:
 * - Clean arc with gradient
 * - Minimal tick marks (labels outside, no overlap)
 * - Large centered value
 * - Smooth animations
 */
import React, { useMemo } from 'react';

export default function CircularGauge({
  value = 0,
  min = 0,
  max = 100,
  size = 200,
  strokeWidth = 10,
  color = '#00d26a',
  bgColor = '#1f1f1f',
  label = '',
  unit = '',
  showValue = true,
  segments = null,
  children,
}) {
  // Calculate dimensions based on size
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2 - 15; // Leave room for labels
  
  // Arc configuration: 270 degrees (from 135° to 405°)
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;

  // Clamp and normalize value
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = (normalizedValue - min) / (max - min);
  const valueAngle = startAngle + percentage * totalAngle;

  // Convert polar to cartesian coordinates
  const polarToCartesian = (angle, r = radius) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  // Create SVG arc path
  const describeArc = (startA, endA, r = radius) => {
    const start = polarToCartesian(startA, r);
    const end = polarToCartesian(endA, r);
    const largeArcFlag = endA - startA <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Unique gradient ID
  const gradientId = useMemo(() => `gauge-${Math.random().toString(36).substr(2, 9)}`, []);

  // Generate tick marks - positioned OUTSIDE the arc
  const ticks = useMemo(() => {
    const numMajorTicks = 4; // e.g., 0, 45, 90, 135, 180 for max=180
    const tickMarks = [];
    
    for (let i = 0; i <= numMajorTicks; i++) {
      const tickAngle = startAngle + (i / numMajorTicks) * totalAngle;
      const tickRad = ((tickAngle - 90) * Math.PI) / 180;
      const tickValue = min + (i / numMajorTicks) * (max - min);
      
      // Tick line: from arc edge outward
      const innerR = radius + 2;
      const outerR = radius + 8;
      
      // Label position: further outside
      const labelR = radius + 20;
      
      tickMarks.push({
        x1: center + innerR * Math.cos(tickRad),
        y1: center + innerR * Math.sin(tickRad),
        x2: center + outerR * Math.cos(tickRad),
        y2: center + outerR * Math.sin(tickRad),
        labelX: center + labelR * Math.cos(tickRad),
        labelY: center + labelR * Math.sin(tickRad),
        value: tickValue,
      });
    }
    
    return tickMarks;
  }, [min, max, radius, center, startAngle, totalAngle]);

  // Calculate color based on value for dynamic coloring
  const getValueColor = () => {
    if (segments && segments.length > 0) {
      const segmentIndex = Math.min(
        Math.floor(percentage * (segments.length - 1)),
        segments.length - 1
      );
      return segments[segmentIndex]?.color || color;
    }
    return color;
  };

  const valueColor = getValueColor();

  // Font sizes based on gauge size
  const valueFontSize = Math.max(28, size * 0.18);
  const unitFontSize = Math.max(11, size * 0.055);
  const labelFontSize = Math.max(9, size * 0.045);
  const tickFontSize = Math.max(9, size * 0.05);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          {/* Gradient for the arc */}
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            {segments ? (
              segments.map((seg, i) => (
                <stop
                  key={i}
                  offset={`${(seg.value / max) * 100}%`}
                  stopColor={seg.color}
                />
              ))
            ) : (
              <>
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={color} />
              </>
            )}
          </linearGradient>
          
          {/* Glow filter */}
          <filter id={`glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
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

        {/* Value arc with gradient */}
        {percentage > 0.01 && (
          <path
            d={describeArc(startAngle, valueAngle)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `url(#glow-${gradientId})`,
              transition: 'all 0.3s ease-out',
            }}
          />
        )}

        {/* Tick marks with labels OUTSIDE */}
        {ticks.map((tick, i) => (
          <g key={i}>
            {/* Tick line */}
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="#444"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Label outside the arc */}
            <text
              x={tick.labelX}
              y={tick.labelY}
              fill="#666"
              fontSize={tickFontSize}
              fontWeight="500"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Math.round(tick.value)}
            </text>
          </g>
        ))}

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={5}
          fill={valueColor}
          style={{ filter: `url(#glow-${gradientId})` }}
        />

        {/* Needle/indicator at current value position */}
        {(() => {
          const needleRad = ((valueAngle - 90) * Math.PI) / 180;
          const needleInner = radius - strokeWidth / 2 - 8;
          const needleOuter = radius + strokeWidth / 2 + 2;
          return (
            <line
              x1={center + needleInner * Math.cos(needleRad)}
              y1={center + needleInner * Math.sin(needleRad)}
              x2={center + needleOuter * Math.cos(needleRad)}
              y2={center + needleOuter * Math.sin(needleRad)}
              stroke={valueColor}
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                filter: `url(#glow-${gradientId})`,
                transition: 'all 0.3s ease-out',
              }}
            />
          );
        })()}
      </svg>

      {/* Central value display */}
      {showValue && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          {/* Main value + unit on same line */}
          <div className="flex items-baseline gap-1">
            <span 
              className="font-bold number-display leading-none"
              style={{ 
                color: valueColor,
                fontSize: valueFontSize,
                textShadow: `0 0 15px ${valueColor}50`,
              }}
            >
              {typeof value === 'number' ? Math.round(value) : value}
            </span>
            
            {/* Unit next to value */}
            {unit && (
              <span 
                className="text-gray-400 font-medium"
                style={{ fontSize: unitFontSize }}
              >
                {unit}
              </span>
            )}
          </div>
          
          {/* Label below */}
          {label && (
            <span 
              className="text-gray-500 uppercase tracking-wider mt-1"
              style={{ fontSize: labelFontSize }}
            >
              {label}
            </span>
          )}
          
          {/* Additional children (like optimal speed indicator) */}
          {children}
        </div>
      )}
    </div>
  );
}