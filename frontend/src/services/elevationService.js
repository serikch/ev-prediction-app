/**
 * Elevation API service
 * Uses OpenTopoData eudem25m for float-precision elevation
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get elevation for a single GPS point
 */
export async function getElevation(latitude, longitude) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/elevation/single?latitude=${latitude}&longitude=${longitude}`
    );

    if (!response.ok) {
      console.warn(`Elevation API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.elevation;
  } catch (error) {
    console.warn('Failed to fetch elevation:', error);
    return null;
  }
}

/**
 * Get elevations for multiple GPS points
 */
export async function getElevations(points) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/elevation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        points: points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
      }),
    });

    if (!response.ok) {
      console.warn(`Elevation batch API error: ${response.status}`);
      return points.map(() => null);
    }

    const data = await response.json();
    return data.points.map(p => p.elevation);
  } catch (error) {
    console.warn('Failed to fetch elevations:', error);
    return points.map(() => null);
  }
}

/**
 * Get elevations with slope calculation
 */
export async function getElevationsWithSlope(points) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/elevation/with-slope`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
        }))
      ),
    });

    if (!response.ok) {
      console.warn(`Elevation with slope API error: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn('Failed to fetch elevations with slope:', error);
    return null;
  }
}

/**
 * Direct OpenTopoData API call (fallback)
 * Uses eudem25m dataset for float precision
 */
export async function getElevationDirect(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.opentopodata.org/v1/eudem25m?locations=${latitude},${longitude}&interpolation=bilinear`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results[0]) {
      return data.results[0].elevation;
    }
    
    return null;
  } catch (error) {
    console.warn('Direct elevation API failed:', error);
    return null;
  }
}
