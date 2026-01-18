/**
 * Prediction API service
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Send sensor data and get power prediction
 */
export async function predictEnergy(sensorData, vehicleType = 'BEV1', sessionId = 'default') {
  const response = await fetch(`${API_BASE_URL}/api/predict?session_id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vehicle_type: vehicleType,
      current_data: {
        speed_kmh: sensorData.speed,
        latitude: sensorData.latitude,
        longitude: sensorData.longitude,
        elevation: sensorData.elevation,
        timestamp: sensorData.timestamp,
        soc: sensorData.soc,
        ambient_temp: sensorData.ambientTemp,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Prediction failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get available models info
 */
export async function getModelsInfo() {
  const response = await fetch(`${API_BASE_URL}/api/predict/models`);
  
  if (!response.ok) {
    throw new Error(`Failed to get models: ${response.status}`);
  }

  return response.json();
}

/**
 * Clear prediction session
 */
export async function clearSession(sessionId = 'default') {
  const response = await fetch(`${API_BASE_URL}/api/predict/session/${sessionId}`, {
    method: 'DELETE',
  });

  return response.json();
}

/**
 * Run batch prediction
 */
export async function predictBatch(dataPoints, vehicleType = 'BEV1') {
  const response = await fetch(`${API_BASE_URL}/api/predict/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data_points: dataPoints.map(point => ({
        speed_kmh: point.speed,
        latitude: point.latitude,
        longitude: point.longitude,
        elevation: point.elevation,
        timestamp: point.timestamp,
        soc: point.soc,
        ambient_temp: point.ambientTemp,
      })),
      vehicle_type: vehicleType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Batch prediction failed: ${response.status}`);
  }

  return response.json();
}
