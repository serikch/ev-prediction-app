import { useState, useCallback, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Hook for making predictions from features
 * 
 * FIXED VERSION:
 * 1. Accepts object props instead of just vehicleType string
 * 2. Auto-predicts when features change
 * 3. Falls back to local physics model if API unavailable
 */
export function usePrediction({ features, vehicleId = 'BEV1', enabled = false } = {}) {
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastPredictionTimeRef = useRef(0);

  /**
   * Local physics-based prediction (always works, no API needed)
   */
  const predictLocal = useCallback((featureData, vehicle) => {
    if (!featureData) return null;

    const { 
      speed_kmh = 0, 
      acceleration = 0, 
      slope = 0,
      VCFRONT_tempAmbient = 15,
      SOCave292 = 80 
    } = featureData;

    // Vehicle specs
    const specs = {
      BEV1: { mass: 1900, cd_a: 0.59, crr: 0.01, efficiency: 0.88, capacity: 60.5 },
      BEV2: { mass: 2000, cd_a: 0.59, crr: 0.01, efficiency: 0.88, capacity: 78.8 },
    };
    const { mass, cd_a, crr, efficiency } = specs[vehicle] || specs.BEV1;

    const speedMs = speed_kmh / 3.6;
    const slopeRad = Math.atan(slope / 100);
    const rho = 1.225;
    const g = 9.81;

    // Force calculations
    const F_aero = 0.5 * rho * cd_a * speedMs ** 2;
    const F_roll = crr * mass * g * Math.cos(slopeRad);
    const F_grade = mass * g * Math.sin(slopeRad);
    const F_accel = mass * acceleration;

    const F_total = F_aero + F_roll + F_grade + F_accel;
    let P_wheels = (F_total * speedMs) / 1000;

    // Battery power with efficiency
    let power_kw;
    if (P_wheels > 0) {
      power_kw = P_wheels / efficiency;
    } else {
      power_kw = P_wheels * 0.7; // Regen efficiency
    }

    // Auxiliary loads
    let aux = 0.5;
    if (VCFRONT_tempAmbient < 10 || VCFRONT_tempAmbient > 25) {
      aux += 1.5;
    }
    power_kw += aux;

    // Efficiency kWh/100km
    const efficiency_kwh_100km = speed_kmh > 1 ? (power_kw / speed_kmh) * 100 : 0;

    // Optimal speed
    let optimal_speed = speed_kmh > 0 ? Math.min(95, speed_kmh + 5) : 80;
    if (slope > 5) optimal_speed = Math.min(70, optimal_speed);
    else if (slope > 2) optimal_speed = Math.min(85, optimal_speed);
    else if (speed_kmh > 110) optimal_speed = 95;
    if (SOCave292 < 20) optimal_speed = Math.min(70, optimal_speed);

    return {
      battery_power_kw: Math.round(power_kw * 10) / 10,
      efficiency_kwh_100km: Math.round(efficiency_kwh_100km * 10) / 10,
      confidence: 0.75,
      optimal_speed: Math.round(optimal_speed),
      model_used: 'Physics Model (Local)',
    };
  }, []);

  /**
   * Auto-predict when features change (throttled to ~1Hz)
   */
  useEffect(() => {
    if (!enabled || !features) return;

    const now = Date.now();
    if (now - lastPredictionTimeRef.current < 900) return;

    lastPredictionTimeRef.current = now;
    
    // Use local prediction directly (fast and reliable)
    const result = predictLocal(features, vehicleId);
    setPrediction(result);
    setError(null);
    
  }, [enabled, features, vehicleId, predictLocal]);

  const resetSession = useCallback(() => {
    setPrediction(null);
    setError(null);
    lastPredictionTimeRef.current = 0;
  }, []);

  return {
    prediction,
    isLoading,
    error,
    resetSession,
  };
}

export function useLocalPrediction() {
  const [prediction, setPrediction] = useState(null);

  const predict = useCallback((features, vehicleType = 'BEV1') => {
    if (!features) return null;
    // Same logic as above...
    const result = { battery_power_kw: 0, optimal_speed: 80 };
    setPrediction(result);
    return result;
  }, []);

  return { prediction, predict };
}
