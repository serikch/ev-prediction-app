import { useState, useCallback, useRef, useEffect } from 'react';

// Use the actual backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ev-prediction-app.onrender.com';

/**
 * Hook for making predictions using the ML API
 * 
 * FIXED VERSION:
 * 1. Actually calls the ML backend API
 * 2. Falls back to local physics only if API fails
 * 3. Default vehicle is BEV2 (model was trained on it)
 */
export function usePrediction({ features, vehicleId = 'BEV2', enabled = false } = {}) {
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastPredictionTimeRef = useRef(0);
  const abortControllerRef = useRef(null);

  /**
   * Call the ML API for prediction
   */
  const predictWithAPI = useCallback(async (featureData, vehicle) => {
    if (!featureData) return null;

    try {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_type: vehicle,
          features: featureData,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        battery_power_kw: data.battery_power_kw,
        efficiency_kwh_100km: data.efficiency_kwh_100km,
        confidence: data.confidence,
        optimal_speed: data.optimal_speed,
        recommendation_message: data.recommendation_message,
        recommendation_type: data.recommendation_type,
        model_used: data.model_used,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      console.warn('ML API failed, using local physics:', err.message);
      return null;
    }
  }, []);

  /**
   * Local physics-based prediction (fallback)
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
    const { mass, cd_a, crr, efficiency } = specs[vehicle] || specs.BEV2;

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
      power_kw = P_wheels * 0.7;
    }

    // Auxiliary loads
    let aux = 0.5;
    if (VCFRONT_tempAmbient < 10 || VCFRONT_tempAmbient > 25) {
      aux += 1.5;
    }
    power_kw += aux;

    const efficiency_kwh_100km = speed_kmh > 1 ? (power_kw / speed_kmh) * 100 : 0;

    let optimal_speed = speed_kmh > 0 ? Math.min(95, speed_kmh + 5) : 80;
    if (slope > 5) optimal_speed = Math.min(70, optimal_speed);
    else if (slope > 2) optimal_speed = Math.min(85, optimal_speed);
    else if (speed_kmh > 110) optimal_speed = 95;
    if (SOCave292 < 20) optimal_speed = Math.min(70, optimal_speed);

    // Generate recommendation
    let recommendation_message = 'Normal driving';
    let recommendation_type = 'info';
    
    if (power_kw < -5) {
      recommendation_message = `Regeneration active (${Math.abs(power_kw).toFixed(0)} kW recovered)`;
      recommendation_type = 'info';
    } else if (power_kw > 80 && speed_kmh > 100) {
      recommendation_message = 'Very high consumption - Reduce to 90 km/h to save ~25%';
      recommendation_type = 'danger';
    } else if (slope > 5 && power_kw > 40) {
      recommendation_message = `Uphill ${slope.toFixed(1)}% - Maintain steady speed`;
      recommendation_type = 'warning';
    } else if (acceleration > 2.0) {
      recommendation_message = 'Strong acceleration - Accelerate gently to save 15-20%';
      recommendation_type = 'warning';
    } else if (power_kw < 25 && speed_kmh > 30) {
      recommendation_message = 'Eco-efficient driving 🌿';
      recommendation_type = 'success';
    }

    return {
      battery_power_kw: Math.round(power_kw * 10) / 10,
      efficiency_kwh_100km: Math.round(efficiency_kwh_100km * 10) / 10,
      confidence: 0.75,
      optimal_speed: Math.round(optimal_speed),
      recommendation_message,
      recommendation_type,
      model_used: 'Physics (Fallback)',
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
    setIsLoading(true);

    // Try ML API first, fallback to local
    const makePrediction = async () => {
      let result = await predictWithAPI(features, vehicleId);
      
      if (!result) {
        result = predictLocal(features, vehicleId);
      }
      
      setPrediction(result);
      setIsLoading(false);
      setError(null);
    };

    makePrediction();
    
  }, [enabled, features, vehicleId, predictWithAPI, predictLocal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const predict = useCallback((features, vehicleType = 'BEV2') => {
    if (!features) return null;
    const result = { battery_power_kw: 0, optimal_speed: 80 };
    setPrediction(result);
    return result;
  }, []);

  return { prediction, predict };
}