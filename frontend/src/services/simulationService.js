/**
 * Simulation API service
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Run a full trip simulation
 */
export async function runSimulation(dataPoints, vehicleType = 'BEV1', initialSoc = 80, ambientTemp = 15) {
  const response = await fetch(`${API_BASE_URL}/api/simulation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vehicle_type: vehicleType,
      initial_soc: initialSoc,
      ambient_temp: ambientTemp,
      data_points: dataPoints.map(p => ({
        timestamp: p.timestamp,
        speed_kmh: p.speed,
        latitude: p.latitude,
        longitude: p.longitude,
        elevation: p.elevation,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Simulation failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate mock trip data for testing
 */
export async function generateMockTrip(durationSeconds = 600, avgSpeed = 50) {
  const response = await fetch(
    `${API_BASE_URL}/api/simulation/mock-trip?duration_seconds=${durationSeconds}&avg_speed=${avgSpeed}`
  );

  if (!response.ok) {
    throw new Error(`Mock trip generation failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate local mock trip data (no API needed)
 */
export function generateLocalMockTrip(durationSeconds = 300, startLat = 50.85, startLon = 4.35) {
  const points = [];
  
  let lat = startLat;
  let lon = startLon;
  let elevation = 45 + Math.random() * 10;
  let speed = 0;
  
  const phases = [
    { name: 'acceleration', duration: 0.15, targetSpeed: 60 },
    { name: 'cruise1', duration: 0.25, targetSpeed: 70 },
    { name: 'highway', duration: 0.35, targetSpeed: 110 },
    { name: 'deceleration', duration: 0.15, targetSpeed: 40 },
    { name: 'stop', duration: 0.10, targetSpeed: 0 },
  ];

  for (let t = 0; t < durationSeconds; t++) {
    // Determine current phase
    const progress = t / durationSeconds;
    let currentPhase = phases[0];
    let accumulatedDuration = 0;
    
    for (const phase of phases) {
      accumulatedDuration += phase.duration;
      if (progress < accumulatedDuration) {
        currentPhase = phase;
        break;
      }
    }

    // Update speed
    const targetSpeed = currentPhase.targetSpeed;
    const speedDiff = targetSpeed - speed;
    const maxChange = currentPhase.name === 'acceleration' ? 3 : 
                      currentPhase.name === 'deceleration' ? -2 : 1;
    
    if (Math.abs(speedDiff) > 1) {
      speed += Math.sign(speedDiff) * Math.min(Math.abs(maxChange), Math.abs(speedDiff) * 0.1);
    }
    speed += (Math.random() - 0.5) * 2; // Add noise
    speed = Math.max(0, Math.min(130, speed));

    // Update position
    const distanceM = speed / 3.6; // meters per second
    const bearing = Math.random() * 0.2 - 0.1; // slight direction changes
    lat += distanceM * 0.000009 * Math.cos(bearing);
    lon += distanceM * 0.000014 * Math.sin(bearing + Math.PI / 4);

    // Update elevation with realistic changes
    const elevationChange = (Math.random() - 0.5) * 0.8;
    // Occasional hills
    if (Math.random() < 0.05) {
      elevation += (Math.random() - 0.4) * 5;
    } else {
      elevation += elevationChange;
    }
    elevation = Math.max(0, elevation);

    points.push({
      timestamp: t,
      speed: Math.round(speed * 10) / 10,
      latitude: Math.round(lat * 1000000) / 1000000,
      longitude: Math.round(lon * 1000000) / 1000000,
      elevation: Math.round(elevation * 100) / 100,
    });
  }

  return points;
}

/**
 * Get vehicle specifications
 */
export async function getVehicleSpecs() {
  const response = await fetch(`${API_BASE_URL}/api/vehicles`);

  if (!response.ok) {
    throw new Error(`Failed to get vehicle specs: ${response.status}`);
  }

  return response.json();
}
