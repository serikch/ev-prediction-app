import React from 'react';
import CircularGauge from '../common/CircularGauge';

/**
 * Speed gauge component - main dashboard display
 */
export default function SpeedGauge({ 
  speed = 0, 
  recommendedSpeed = null,
  maxSpeed = 180,
  size = 280,
}) {
  // Color based on speed vs recommended
  let color = '#00d26a'; // Green - optimal
  
  if (recommendedSpeed !== null) {
    const diff = speed - recommendedSpeed;
    if (diff > 20) {
      color = '#ff3b30'; // Red - too fast
    } else if (diff > 10) {
      color = '#ff9500'; // Orange - slightly fast
    } else if (diff > 0) {
      color = '#ffcc00'; // Yellow - marginally fast
    }
  } else if (speed > 130) {
    color = '#ff3b30';
  } else if (speed > 100) {
    color = '#ff9500';
  }

  // Gradient segments
  const segments = [
    { value: 0, color: '#00d26a' },
    { value: 60, color: '#00d26a' },
    { value: 90, color: '#ffcc00' },
    { value: 120, color: '#ff9500' },
    { value: 150, color: '#ff3b30' },
  ];

  return (
    <div className="relative">
      <CircularGauge
        value={speed}
        min={0}
        max={maxSpeed}
        size={size}
        strokeWidth={14}
        color={color}
        label="vitesse"
        unit="km/h"
        segments={segments}
      >
        {/* Recommended speed indicator */}
        {recommendedSpeed !== null && speed > 5 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <span>Optimal:</span>
            <span className="text-green-400 font-medium">{Math.round(recommendedSpeed)}</span>
            <span>km/h</span>
          </div>
        )}
      </CircularGauge>
    </div>
  );
}
