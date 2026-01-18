import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for real-time GPS tracking
 * 
 * FIXED VERSION:
 * 1. Accepts object props like useSimulatedGeolocation
 * 2. Calculates speed from position changes (works on desktop!)
 * 3. Detailed logging for debugging
 * 4. Better error handling
 */
export function useGeolocation({ enabled = false, updateInterval = 1000 } = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  
  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);

  /**
   * Calculate speed from two positions (for desktop where coords.speed is null)
   */
  const calculateSpeed = useCallback((newPos, oldPos, timeDeltaMs) => {
    if (!oldPos || timeDeltaMs <= 0) return 0;
    
    // Haversine distance
    const R = 6371000; // Earth radius in meters
    const lat1 = oldPos.latitude * Math.PI / 180;
    const lat2 = newPos.latitude * Math.PI / 180;
    const dLat = (newPos.latitude - oldPos.latitude) * Math.PI / 180;
    const dLon = (newPos.longitude - oldPos.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // meters
    
    // Speed in km/h
    const speedMs = distance / (timeDeltaMs / 1000);
    const speedKmh = speedMs * 3.6;
    
    // Filter out unrealistic speeds (GPS noise when stationary)
    if (speedKmh < 1) return 0;
    if (speedKmh > 200) return lastPositionRef.current?.speed || 0; // Keep last valid
    
    return speedKmh;
  }, []);

  /**
   * Process a new GPS position
   */
  const processPosition = useCallback((pos) => {
    const now = Date.now();
    const timeDelta = now - lastUpdateTimeRef.current;
    
    // Throttle updates
    if (timeDelta < updateInterval * 0.9) {
      return;
    }
    
    const newPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      altitude: pos.coords.altitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      timestamp: now / 1000,
    };
    
    // Calculate speed - prefer GPS speed if available, otherwise calculate
    let speed = 0;
    if (pos.coords.speed !== null && pos.coords.speed !== undefined && pos.coords.speed >= 0) {
      // GPS provides speed (mobile devices)
      speed = pos.coords.speed * 3.6; // m/s to km/h
      console.log(`📍 GPS speed available: ${speed.toFixed(1)} km/h`);
    } else if (lastPositionRef.current) {
      // Calculate from position change (desktop)
      speed = calculateSpeed(newPosition, lastPositionRef.current, timeDelta);
      console.log(`📍 Calculated speed: ${speed.toFixed(1)} km/h (from ${timeDelta}ms delta)`);
    }
    
    newPosition.speed = speed;
    
    // Log position update
    console.log(`📍 GPS Update:`, {
      lat: newPosition.latitude.toFixed(6),
      lon: newPosition.longitude.toFixed(6),
      speed: `${speed.toFixed(1)} km/h`,
      accuracy: `${pos.coords.accuracy?.toFixed(0)}m`,
      altitude: newPosition.altitude ? `${newPosition.altitude.toFixed(0)}m` : 'N/A',
    });
    
    // Save for next calculation
    lastPositionRef.current = newPosition;
    lastUpdateTimeRef.current = now;
    
    setPosition(newPosition);
    setError(null);
  }, [updateInterval, calculateSpeed]);

  /**
   * Handle GPS errors
   */
  const handleError = useCallback((err) => {
    console.error('📍 GPS Error:', err.code, err.message);
    
    let errorMessage = err.message;
    switch (err.code) {
      case 1: // PERMISSION_DENIED
        errorMessage = 'Permission GPS refusée. Autorisez l\'accès dans les paramètres.';
        setPermissionStatus('denied');
        break;
      case 2: // POSITION_UNAVAILABLE
        errorMessage = 'Position GPS non disponible. Vérifiez que le GPS est activé.';
        break;
      case 3: // TIMEOUT
        errorMessage = 'Délai GPS dépassé. Réessayez dans un endroit avec meilleur signal.';
        break;
    }
    
    setError(errorMessage);
  }, []);

  /**
   * Start GPS tracking
   */
  const startTracking = useCallback(() => {
    console.log('📍 Starting GPS tracking...');
    
    if (!navigator.geolocation) {
      const msg = 'Géolocalisation non supportée par ce navigateur';
      console.error('📍', msg);
      setError(msg);
      return;
    }

    setIsTracking(true);
    setError(null);
    lastPositionRef.current = null;
    lastUpdateTimeRef.current = 0;

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,      // 15 seconds
      maximumAge: 1000,    // Accept 1 second old positions
    };

    // Get initial position
    console.log('📍 Requesting initial position...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('📍 Initial position received!');
        setPermissionStatus('granted');
        processPosition(pos);
      },
      (err) => {
        console.error('📍 Initial position failed:', err);
        handleError(err);
      },
      options
    );

    // Start continuous watching
    console.log('📍 Starting position watch...');
    watchIdRef.current = navigator.geolocation.watchPosition(
      processPosition,
      handleError,
      {
        ...options,
        maximumAge: 0, // Always get fresh position for watch
      }
    );
    
    console.log('📍 Watch ID:', watchIdRef.current);
  }, [processPosition, handleError]);

  /**
   * Stop GPS tracking
   */
  const stopTracking = useCallback(() => {
    console.log('📍 Stopping GPS tracking...');
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      console.log('📍 Cleared watch ID:', watchIdRef.current);
      watchIdRef.current = null;
    }
    
    setIsTracking(false);
  }, []);

  /**
   * Check permission status on mount
   */
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('📍 Permission status:', result.state);
        setPermissionStatus(result.state);
        
        result.onchange = () => {
          console.log('📍 Permission changed to:', result.state);
          setPermissionStatus(result.state);
        };
      }).catch(() => {
        // Permission API not supported
        setPermissionStatus('unknown');
      });
    }
  }, []);

  /**
   * Start/stop based on enabled prop
   */
  useEffect(() => {
    console.log('📍 useGeolocation effect - enabled:', enabled);
    
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    position,
    error,
    isTracking,
    permissionStatus,
    startTracking,
    stopTracking,
  };
}

/**
 * Hook for simulated GPS data (for testing without real GPS)
 * 
 * Generates realistic car trip data when started:
 * - Acceleration phases (0 → 50 km/h)
 * - Cruising phases (50-120 km/h) 
 * - Deceleration phases
 * - Variable slopes
 */
export function useSimulatedGeolocation({ enabled = false } = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const stateRef = useRef(null);
  
  // Initialize state only once
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      speed: 0,
      targetSpeed: 50,
      latitude: 50.8503,  // Brussels
      longitude: 4.3517,
      elevation: 50,
      phase: 'accelerating',
      phaseTime: 0,
      phaseDuration: 15,
    };
  }

  // Main simulation effect
  useEffect(() => {
    if (!enabled) {
      // Stop simulation when disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    // Already running? Don't restart
    if (intervalRef.current) return;
    
    console.log('🚗 Simulation started');
    
    // Reset state for new trip
    stateRef.current = {
      time: 0,
      speed: 0,
      targetSpeed: 50,
      latitude: 50.8503,
      longitude: 4.3517,
      elevation: 50,
      phase: 'accelerating',
      phaseTime: 0,
      phaseDuration: 15,
    };
    
    // Generate next simulation point
    const generateNextPoint = () => {
      const state = stateRef.current;
      state.time += 1;
      state.phaseTime += 1;
      
      // Phase transitions
      if (state.phaseTime >= state.phaseDuration) {
        state.phaseTime = 0;
        
        if (state.phase === 'accelerating') {
          state.phase = 'cruising';
          state.phaseDuration = 20 + Math.random() * 40;
          state.targetSpeed = 60 + Math.random() * 60;
          console.log(`🚗 Phase: cruising, target: ${state.targetSpeed.toFixed(0)} km/h`);
        } else if (state.phase === 'cruising') {
          if (Math.random() > 0.3) {
            state.phase = 'decelerating';
            state.phaseDuration = 8 + Math.random() * 12;
            state.targetSpeed = 20 + Math.random() * 30;
            console.log(`🚗 Phase: decelerating, target: ${state.targetSpeed.toFixed(0)} km/h`);
          } else {
            state.targetSpeed = 50 + Math.random() * 70;
            state.phaseDuration = 15 + Math.random() * 30;
          }
        } else if (state.phase === 'decelerating') {
          state.phase = 'accelerating';
          state.phaseDuration = 10 + Math.random() * 15;
          state.targetSpeed = 70 + Math.random() * 50;
          console.log(`🚗 Phase: accelerating, target: ${state.targetSpeed.toFixed(0)} km/h`);
        }
      }
      
      // Speed dynamics
      const speedDiff = state.targetSpeed - state.speed;
      let acceleration;
      
      if (state.phase === 'accelerating') {
        acceleration = Math.min(5, Math.max(2, speedDiff * 0.15));
      } else if (state.phase === 'decelerating') {
        acceleration = Math.max(-5, Math.min(-2, speedDiff * 0.2));
      } else {
        acceleration = speedDiff * 0.1;
      }
      
      state.speed += acceleration + (Math.random() - 0.5) * 0.5;
      state.speed = Math.max(0, Math.min(150, state.speed));
      
      // Position update
      const speedMs = state.speed / 3.6;
      const heading = Math.PI / 4 + Math.sin(state.time / 50) * 0.3;
      const latDelta = (speedMs * Math.cos(heading)) / 111000;
      const lonDelta = (speedMs * Math.sin(heading)) / (111000 * Math.cos(state.latitude * Math.PI / 180));
      
      state.latitude += latDelta;
      state.longitude += lonDelta;
      
      // Elevation changes
      const slopeChange = Math.sin(state.time / 30) * 0.5 + Math.sin(state.time / 100) * 1;
      state.elevation += slopeChange + (Math.random() - 0.5) * 0.2;
      state.elevation = Math.max(0, Math.min(300, state.elevation));
      
      const newPosition = {
        latitude: state.latitude,
        longitude: state.longitude,
        altitude: state.elevation,
        speed: state.speed,
        timestamp: Date.now() / 1000,
        accuracy: 5 + Math.random() * 5,
      };
      
      // Log every 5 seconds
      if (state.time % 5 === 0) {
        console.log(`🚗 t=${state.time}s: ${state.speed.toFixed(1)} km/h (${state.phase}, target: ${state.targetSpeed.toFixed(0)})`);
      }
      
      return newPosition;
    };
    
    // Generate first point immediately
    setPosition(generateNextPoint());
    
    // Update every second
    intervalRef.current = setInterval(() => {
      setPosition(generateNextPoint());
    }, 1000);
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        console.log('🚗 Simulation stopped');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  const start = useCallback(() => {
    console.log('start() called - handled by effect');
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setPosition(null);
    if (stateRef.current) {
      stateRef.current.time = 0;
      stateRef.current.speed = 0;
    }
  }, [stop]);

  return {
    position,
    error,
    isTracking: intervalRef.current !== null,
    permissionStatus: 'granted', // Simulation always works
    start,
    stop,
    reset,
  };
}
