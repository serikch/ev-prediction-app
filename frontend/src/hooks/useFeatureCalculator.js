import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

/**
 * Circular buffer for storing historical data points
 */
class DataBuffer {
  constructor(maxSize = 20) {
    this.maxSize = maxSize;
    this.data = [];
  }

  add(point) {
    this.data.push(point);
    if (this.data.length > this.maxSize) {
      this.data.shift();
    }
  }

  getStats(key, window) {
    const values = this.data.slice(-window).map(d => d[key]).filter(v => v !== undefined);
    if (values.length === 0) return { mean: 0, std: 0, max: 0, min: 0 };
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = values.length > 1 
      ? Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length)
      : 0;
    
    return {
      mean,
      std,
      max: Math.max(...values),
      min: Math.min(...values),
    };
  }

  getLast() {
    return this.data.length > 0 ? this.data[this.data.length - 1] : null;
  }

  clear() {
    this.data = [];
  }
}

/**
 * Calculate speed regime category
 */
function getSpeedRegime(speed) {
  if (speed < 30) return 0;
  if (speed < 60) return 1;
  if (speed < 90) return 2;
  return 3;
}

/**
 * Calculate slope category
 */
function getSlopeCategory(slope) {
  if (slope < -5) return 0;
  if (slope < -2) return 1;
  if (slope <= 2) return 2;
  if (slope <= 5) return 3;
  return 4;
}

/**
 * Calculate temperature category
 */
function getTempCategory(temp) {
  if (temp < 0) return 0;
  if (temp < 10) return 1;
  if (temp < 20) return 2;
  if (temp < 30) return 3;
  return 4;
}

/**
 * Hook for calculating ML features from sensor data
 * 
 * @param {Object} options
 * @param {Object} options.gpsData - Current GPS position data
 * @param {Object} options.config - Trip configuration (soc, temperature, vehicle)
 * @param {boolean} options.enabled - Whether calculation is enabled
 */
export function useFeatureCalculator({ gpsData, config, enabled } = {}) {
  const bufferRef = useRef(new DataBuffer(20));
  const tripStateRef = useRef({
    cumulElevationGain: 0,
    cumulElevationLoss: 0,
    timeSinceStop: 0,
    lastSoc: 80,
    startTime: null,
  });

  const [features, setFeatures] = useState(null);
  const [stats, setStats] = useState({
    cumulElevationGain: 0,
    cumulElevationLoss: 0,
    timeSinceStop: 0,
    duration: 0,
  });

  /**
   * Reset trip state for a new trip
   */
  const reset = useCallback((initialSoc = 80) => {
    bufferRef.current.clear();
    tripStateRef.current = {
      cumulElevationGain: 0,
      cumulElevationLoss: 0,
      timeSinceStop: 0,
      lastSoc: initialSoc,
      startTime: null,
    };
    setFeatures(null);
    setStats({
      cumulElevationGain: 0,
      cumulElevationLoss: 0,
      timeSinceStop: 0,
      duration: 0,
    });
  }, []);

  /**
   * Calculate all 36 features from current sensor data
   */
  const calculateFeatures = useCallback((sensorData) => {
    const buffer = bufferRef.current;
    const tripState = tripStateRef.current;
    const lastPoint = buffer.getLast();

    const {
      speed = 0,
      latitude,
      longitude,
      elevation = 0,
      timestamp,
      soc = 80,
      ambientTemp = 15,
    } = sensorData;

    // Initialize start time
    if (tripState.startTime === null) {
      tripState.startTime = timestamp;
    }

    // Calculate time delta
    const dt = lastPoint ? Math.max(0.1, Math.min(10, timestamp - lastPoint.timestamp)) : 1;

    // Calculate acceleration (m/sÂ²)
    const speedMs = speed / 3.6;
    const prevSpeedMs = lastPoint ? lastPoint.speed / 3.6 : speedMs;
    const acceleration = (speedMs - prevSpeedMs) / dt;

    // Calculate elevation difference and slope
    const prevElevation = lastPoint ? lastPoint.elevation : elevation;
    const elevationDiff = elevation - prevElevation;
    
    // Estimate distance from speed
    const avgSpeedMs = (speedMs + prevSpeedMs) / 2;
    const distanceM = avgSpeedMs * dt;
    
    let slope = 0;
    if (distanceM > 1) {
      slope = Math.max(-20, Math.min(20, (elevationDiff / distanceM) * 100));
    }

    // Add to buffer
    buffer.add({
      timestamp,
      speed,
      acceleration,
      slope,
      elevation,
      soc,
    });

    // Get rolling statistics
    const speedStats10 = buffer.getStats('speed', 10);
    const accelStats5 = buffer.getStats('acceleration', 5);
    const slopeStats20 = buffer.getStats('slope', 20);

    // Update cumulative elevation
    if (elevationDiff > 0) {
      tripState.cumulElevationGain += elevationDiff;
    } else {
      tripState.cumulElevationLoss += Math.abs(elevationDiff);
    }

    // Update time since stop
    if (speed < 1) {
      tripState.timeSinceStop = 0;
    } else {
      tripState.timeSinceStop += 1;
    }

    // SOC delta
    const socDelta = soc - tripState.lastSoc;
    tripState.lastSoc = soc;

    // Calculate all 36 features
    const computed = {
      // Base (11)
      speed_kmh: speed,
      speed2: speed ** 2,
      speed3: speed ** 3,
      acceleration: acceleration,
      slope: slope,
      slope_abs: Math.abs(slope),
      elevation_diff: elevationDiff,
      VCFRONT_tempAmbient: ambientTemp,
      temp_range: 3.0, // Fixed value
      SOCave292: soc,
      soc_delta: socDelta,

      // Interactions (6)
      speed_x_slope: speed * slope,
      speed2_x_slope: speed ** 2 * slope,
      speed_x_slope_abs: speed * Math.abs(slope),
      accel_x_speed: acceleration * speed,
      accel_x_speed2: acceleration * speed ** 2,
      total_effort: speed + Math.abs(slope) * 10 + Math.abs(acceleration) * 5,

      // Rolling (7)
      speed_roll_mean_10: speedStats10.mean,
      speed_roll_std_10: speedStats10.std,
      speed_roll_max_10: speedStats10.max,
      speed_roll_min_10: speedStats10.min,
      accel_roll_mean_5: accelStats5.mean,
      accel_roll_std_5: accelStats5.std,
      slope_roll_mean_20: slopeStats20.mean,

      // Binary state (4)
      is_accelerating: acceleration > 0.1 ? 1 : 0,
      is_braking: acceleration < -0.1 ? 1 : 0,
      is_coasting: Math.abs(acceleration) < 0.1 && speed > 5 ? 1 : 0,
      regen_potential: slope < -2 && speed > 30 ? 1 : 0,

      // Cumulative (3)
      cumul_elevation_gain: tripState.cumulElevationGain,
      cumul_elevation_loss: tripState.cumulElevationLoss,
      time_since_stop: tripState.timeSinceStop,

      // Categorical (3)
      speed_regime: getSpeedRegime(speed),
      slope_category: getSlopeCategory(slope),
      temp_category: getTempCategory(ambientTemp),

      // Ratios (2)
      accel_per_speed: acceleration / (speed + 1),
      slope_per_speed: slope / (speed + 1),
    };

    // Update stats
    setStats({
      cumulElevationGain: tripState.cumulElevationGain,
      cumulElevationLoss: tripState.cumulElevationLoss,
      timeSinceStop: tripState.timeSinceStop,
      duration: tripState.startTime 
        ? (Date.now() / 1000) - tripState.startTime 
        : 0,
    });

    setFeatures(computed);
    return computed;
  }, []);

  // Auto-calculate features when gpsData changes
  useEffect(() => {
    if (!enabled || !gpsData) return;
    
    const sensorData = {
      speed: gpsData.speed || 0,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      elevation: gpsData.altitude || 0,
      timestamp: gpsData.timestamp || Date.now() / 1000,
      soc: config?.soc || 80,
      ambientTemp: config?.temperature || 15,
    };
    
    calculateFeatures(sensorData);
  }, [gpsData, config, enabled, calculateFeatures]);

  return {
    features,
    stats,
    reset,
    calculateFeatures,
  };
}