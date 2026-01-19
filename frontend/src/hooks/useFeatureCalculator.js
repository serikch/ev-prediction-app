import { useState, useCallback, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ev-prediction-app.onrender.com';

/**
 * Circular buffer for storing historical data points
 */
class DataBuffer {
  constructor(maxSize = 30) {
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
    const values = this.data.slice(-window).map(d => d[key]).filter(v => v !== undefined && !isNaN(v));
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

  getLastN(n) {
    return this.data.slice(-n);
  }

  clear() {
    this.data = [];
  }
}

/**
 * Calculate Haversine distance between two GPS points (meters)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch elevation from backend API (uses eudem25m - precise terrain data)
 */
async function fetchElevation(latitude, longitude) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(
      `${API_BASE_URL}/api/elevation/single?latitude=${latitude}&longitude=${longitude}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('Elevation API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.elevation;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Elevation API timeout');
    } else {
      console.warn('Failed to fetch elevation:', error.message);
    }
    return null;
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
 * Exponential moving average for smoothing
 */
function ema(newValue, prevEma, alpha = 0.3) {
  if (prevEma === null || prevEma === undefined) return newValue;
  return alpha * newValue + (1 - alpha) * prevEma;
}

/**
 * Hook for calculating ML features from sensor data
 * 
 * FIXED VERSION with:
 * - Elevation API integration (precise terrain elevation from eudem25m)
 * - Slope smoothing to reduce GPS noise
 * - Proper distance calculation using Haversine formula
 * 
 * @param {Object} options
 * @param {Object} options.gpsData - Current GPS position data
 * @param {Object} options.config - Trip configuration (soc, temperature, vehicle)
 * @param {boolean} options.enabled - Whether calculation is enabled
 */
export function useFeatureCalculator({ gpsData, config, enabled } = {}) {
  const bufferRef = useRef(new DataBuffer(30));
  const elevationCacheRef = useRef(new Map()); // Cache: "lat,lon" -> elevation
  const lastElevationRef = useRef(null);
  const smoothedSlopeRef = useRef(0);
  const pendingElevationRef = useRef(false);
  
  const tripStateRef = useRef({
    cumulElevationGain: 0,
    cumulElevationLoss: 0,
    timeSinceStop: 0,
    lastSoc: 80,
    startTime: null,
    totalDistance: 0,
  });

  const [features, setFeatures] = useState(null);
  const [stats, setStats] = useState({
    cumulElevationGain: 0,
    cumulElevationLoss: 0,
    timeSinceStop: 0,
    duration: 0,
    totalDistance: 0,
    elevationSource: 'none',
  });

  /**
   * Reset trip state for a new trip
   */
  const reset = useCallback((initialSoc = 80) => {
    bufferRef.current.clear();
    elevationCacheRef.current.clear();
    lastElevationRef.current = null;
    smoothedSlopeRef.current = 0;
    pendingElevationRef.current = false;
    tripStateRef.current = {
      cumulElevationGain: 0,
      cumulElevationLoss: 0,
      timeSinceStop: 0,
      lastSoc: initialSoc,
      startTime: null,
      totalDistance: 0,
    };
    setFeatures(null);
    setStats({
      cumulElevationGain: 0,
      cumulElevationLoss: 0,
      timeSinceStop: 0,
      duration: 0,
      totalDistance: 0,
      elevationSource: 'none',
    });
  }, []);

  /**
   * Get elevation with caching
   */
  const getElevation = useCallback(async (latitude, longitude, gpsAltitude) => {
    // Round coordinates to ~10m precision for caching
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Check cache first
    if (elevationCacheRef.current.has(cacheKey)) {
      return { elevation: elevationCacheRef.current.get(cacheKey), source: 'cache' };
    }
    
    // Don't spam API - if already pending, use fallback
    if (pendingElevationRef.current) {
      if (lastElevationRef.current !== null) {
        return { elevation: lastElevationRef.current, source: 'pending' };
      }
      return { elevation: gpsAltitude || 0, source: 'gps' };
    }
    
    // Fetch from API
    pendingElevationRef.current = true;
    const apiElevation = await fetchElevation(latitude, longitude);
    pendingElevationRef.current = false;
    
    if (apiElevation !== null) {
      elevationCacheRef.current.set(cacheKey, apiElevation);
      // Keep cache small (max 200 entries)
      if (elevationCacheRef.current.size > 200) {
        const firstKey = elevationCacheRef.current.keys().next().value;
        elevationCacheRef.current.delete(firstKey);
      }
      return { elevation: apiElevation, source: 'api' };
    }
    
    // Fallback to GPS altitude (less accurate but better than nothing)
    if (gpsAltitude !== null && gpsAltitude !== undefined) {
      return { elevation: gpsAltitude, source: 'gps' };
    }
    
    // Last resort: use last known elevation
    if (lastElevationRef.current !== null) {
      return { elevation: lastElevationRef.current, source: 'last' };
    }
    
    return { elevation: 0, source: 'default' };
  }, []);

  /**
   * Calculate all 36 features from current sensor data
   */
  const calculateFeatures = useCallback(async (sensorData) => {
    const buffer = bufferRef.current;
    const tripState = tripStateRef.current;
    const lastPoint = buffer.getLast();

    const {
      speed = 0,
      latitude,
      longitude,
      gpsAltitude = null,
      timestamp,
      soc = 80,
      ambientTemp = 15,
    } = sensorData;

    // Initialize start time
    if (tripState.startTime === null) {
      tripState.startTime = timestamp;
    }

    // Get elevation from API (or cache/fallback)
    const { elevation, source: elevationSource } = await getElevation(latitude, longitude, gpsAltitude);
    
    // Calculate time delta
    const dt = lastPoint ? Math.max(0.1, Math.min(10, timestamp - lastPoint.timestamp)) : 1;

    // Calculate acceleration (m/s²) from speed change
    const speedMs = speed / 3.6;
    const prevSpeedMs = lastPoint ? lastPoint.speed / 3.6 : speedMs;
    const rawAcceleration = (speedMs - prevSpeedMs) / dt;
    // Clamp acceleration to realistic values
    const acceleration = Math.max(-5, Math.min(5, rawAcceleration));

    // Calculate distance using Haversine (more accurate than speed × time)
    let distanceM = 0;
    if (lastPoint && lastPoint.latitude && lastPoint.longitude) {
      distanceM = haversineDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
      // Sanity check: max 50m per second at 180 km/h
      distanceM = Math.min(distanceM, 50);
    } else {
      // Fallback: estimate from speed
      distanceM = speedMs * dt;
    }
    
    tripState.totalDistance += distanceM;

    // Calculate slope from elevation difference
    const prevElevation = lastElevationRef.current !== null ? lastElevationRef.current : elevation;
    const elevationDiff = elevation - prevElevation;
    lastElevationRef.current = elevation;
    
    // Raw slope calculation (only if we moved enough)
    let rawSlope = 0;
    if (distanceM > 1.0 && speed > 2) { // Need at least 1m movement and some speed
      rawSlope = (elevationDiff / distanceM) * 100; // Percent grade
    }
    
    // Clamp extreme values (roads rarely exceed 15%)
    rawSlope = Math.max(-20, Math.min(20, rawSlope));
    
    // Apply exponential smoothing to reduce noise
    // Alpha = 0.15 means ~7 seconds to reach 63% of new value
    smoothedSlopeRef.current = ema(rawSlope, smoothedSlopeRef.current, 0.15);
    const slope = smoothedSlopeRef.current;

    // Add to buffer
    buffer.add({
      timestamp,
      speed,
      acceleration,
      slope,
      elevation,
      soc,
      latitude,
      longitude,
      distanceM,
    });

    // Get rolling statistics
    const speedStats10 = buffer.getStats('speed', 10);
    const accelStats5 = buffer.getStats('acceleration', 5);
    const slopeStats20 = buffer.getStats('slope', 20);

    // Update cumulative elevation (only count significant changes > 0.3m)
    if (elevationDiff > 0.3) {
      tripState.cumulElevationGain += elevationDiff;
    } else if (elevationDiff < -0.3) {
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

    // Calculate all 36 features for ML model
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

    // Update stats for display
    setStats({
      cumulElevationGain: tripState.cumulElevationGain,
      cumulElevationLoss: tripState.cumulElevationLoss,
      timeSinceStop: tripState.timeSinceStop,
      totalDistance: tripState.totalDistance,
      duration: tripState.startTime 
        ? (Date.now() / 1000) - tripState.startTime 
        : 0,
      elevationSource,
    });

    setFeatures(computed);
    return computed;
  }, [getElevation]);

  // Auto-calculate features when gpsData changes
  useEffect(() => {
    if (!enabled || !gpsData) return;
    
    const sensorData = {
      speed: gpsData.speed || 0,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      gpsAltitude: gpsData.altitude || null, // Keep GPS altitude as fallback
      timestamp: gpsData.timestamp || Date.now() / 1000,
      soc: config?.soc || 80,
      ambientTemp: config?.temperature || 15,
    };
    
    // Call async function
    calculateFeatures(sensorData);
  }, [gpsData, config, enabled, calculateFeatures]);

  return {
    features,
    stats,
    reset,
    calculateFeatures,
  };
}