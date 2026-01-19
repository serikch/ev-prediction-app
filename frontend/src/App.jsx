/**
 * EV Energy Prediction Dashboard - Main Application
 * 
 * FIXED VERSION:
 * - All text in English
 * - BEV2 as default vehicle (ML model trained on it)
 * - Recommendation displayed prominently at top
 * - Better mobile layout with centered speed/power gauges
 * - Uses ML API for predictions
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGeolocation, useSimulatedGeolocation } from './hooks/useGeolocation';
import { useFeatureCalculator } from './hooks/useFeatureCalculator';
import { usePrediction } from './hooks/usePrediction';

// Components
import InitialForm from './components/Setup/InitialForm';
import SpeedGauge from './components/Dashboard/SpeedGauge';
import PowerGauge from './components/Dashboard/PowerGauge';
import BatteryIndicator from './components/Dashboard/BatteryIndicator';
import AccelerationBar from './components/Dashboard/AccelerationBar';
import SlopeIndicator from './components/Dashboard/SlopeIndicator';
import RecommendationCard from './components/Dashboard/RecommendationCard';
import PowerHistory from './components/Charts/PowerHistory';
import SpeedHistory from './components/Charts/SpeedHistory';
import TripStats from './components/Dashboard/TripStats';
import StatusBadge from './components/common/StatusBadge';

// Icons
import { 
  Play, 
  Square, 
  Settings, 
  MapPin,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Cpu
} from 'lucide-react';

// Vehicle battery capacities
const BATTERY_CAPACITY = {
  BEV1: 60.5,
  BEV2: 78.8,
};

// Initial trip state with dynamic SOC
const initialTripState = {
  isActive: false,
  startTime: null,
  distance: 0,
  energyUsed: 0,
  avgEfficiency: 0,
  currentSOC: 75,
  initialSOC: 75,
};

export default function App() {
  // Application state
  const [screen, setScreen] = useState('setup');
  const [tripConfig, setTripConfig] = useState(null);
  const [tripState, setTripState] = useState(initialTripState);
  const [showCharts, setShowCharts] = useState(true);
  const [useSimulation, setUseSimulation] = useState(true);
  
  // Data history for charts
  const [powerHistory, setPowerHistory] = useState([]);
  const [speedHistory, setSpeedHistory] = useState([]);
  const historyRef = useRef({ power: [], speed: [] });
  
  // GPS Hooks
  const realGps = useGeolocation({ 
    enabled: !useSimulation && screen === 'dashboard' && tripState.isActive 
  });
  const simulatedGps = useSimulatedGeolocation({ 
    enabled: useSimulation && screen === 'dashboard' && tripState.isActive,
  });
  
  // Select active GPS source
  const gpsData = useSimulation ? simulatedGps : realGps;
  
  // Feature Calculator
  const { features, stats, reset: resetFeatures } = useFeatureCalculator({
    gpsData: gpsData.position,
    config: tripConfig,
    enabled: tripState.isActive,
  });
  
  // ML Prediction - Using BEV2 by default
  const { prediction, isLoading: predictionLoading, error: predictionError } = usePrediction({
    features,
    vehicleId: tripConfig?.vehicle || 'BEV2',
    enabled: tripState.isActive && features !== null,
  });
  
  // Update history for charts
  useEffect(() => {
    if (!tripState.isActive) return;
    
    const hasPrediction = prediction && typeof prediction.battery_power_kw === 'number';
    const hasFeatures = features && typeof features.speed_kmh === 'number';
    
    if (!hasPrediction && !hasFeatures) return;
    
    const timestamp = Date.now();
    const powerValue = hasPrediction ? prediction.battery_power_kw : 0;
    const speedValue = hasFeatures ? features.speed_kmh : 0;
    const optimalSpeed = hasPrediction ? (prediction.optimal_speed || 80) : 80;
    
    historyRef.current.power.push({
      time: timestamp,
      value: powerValue,
      optimal: powerValue > 0 ? powerValue * 0.8 : powerValue,
    });
    
    historyRef.current.speed.push({
      time: timestamp,
      value: speedValue,
      recommended: optimalSpeed,
    });
    
    const cutoff = timestamp - 60000;
    historyRef.current.power = historyRef.current.power.filter(p => p.time > cutoff);
    historyRef.current.speed = historyRef.current.speed.filter(s => s.time > cutoff);
    
    setPowerHistory([...historyRef.current.power]);
    setSpeedHistory([...historyRef.current.speed]);
    
  }, [prediction, features, tripState.isActive]);
  
  // Update trip statistics including dynamic SOC
  useEffect(() => {
    if (!tripState.isActive || !features) return;
    
    const powerKw = prediction?.battery_power_kw || 0;
    const speedKmh = features.speed_kmh || 0;
    const batteryCapacity = BATTERY_CAPACITY[tripConfig?.vehicle] || 78.8;
    
    setTripState(prev => {
      const energyDelta = powerKw > 0 ? powerKw / 3600 : 0;
      const regenEnergy = powerKw < 0 ? Math.abs(powerKw) / 3600 : 0;
      
      const newEnergy = prev.energyUsed + energyDelta;
      const distanceDelta = speedKmh / 3600;
      const newDistance = prev.distance + distanceDelta;
      
      const socConsumption = (energyDelta / batteryCapacity) * 100;
      const socRegen = (regenEnergy / batteryCapacity) * 100 * 0.7;
      const newSOC = Math.max(0, Math.min(100, prev.currentSOC - socConsumption + socRegen));
      
      return {
        ...prev,
        energyUsed: newEnergy,
        distance: newDistance,
        avgEfficiency: newDistance > 0.01 ? (newEnergy / newDistance) * 100 : 0,
        currentSOC: newSOC,
      };
    });
  }, [prediction, features, tripState.isActive, tripConfig?.vehicle]);
  
  // Handle trip start
  const handleStartTrip = useCallback((config) => {
    console.log('🚗 Starting trip with config:', config);
    setTripConfig(config);
    setScreen('dashboard');
    
    historyRef.current = { power: [], speed: [] };
    setPowerHistory([]);
    setSpeedHistory([]);
    resetFeatures();
    
    const initialSOC = config.soc || 75;
    setTripState({
      isActive: true,
      startTime: Date.now(),
      distance: 0,
      energyUsed: 0,
      avgEfficiency: 0,
      currentSOC: initialSOC,
      initialSOC: initialSOC,
    });
  }, [resetFeatures]);
  
  const handleStopTrip = useCallback(() => {
    console.log('🛑 Stopping trip');
    setTripState(prev => ({ ...prev, isActive: false }));
  }, []);
  
  const handleResumeTrip = useCallback(() => {
    console.log('▶️ Resuming trip');
    setTripState(prev => ({ ...prev, isActive: true }));
  }, []);
  
  const handleBackToSetup = useCallback(() => {
    handleStopTrip();
    setScreen('setup');
    setTripConfig(null);
    setTripState(initialTripState);
    historyRef.current = { power: [], speed: [] };
    setPowerHistory([]);
    setSpeedHistory([]);
  }, [handleStopTrip]);
  
  // Render Setup Screen
  if (screen === 'setup') {
    return (
      <InitialForm 
        onStart={handleStartTrip}
        useSimulation={useSimulation}
        onSimulationToggle={setUseSimulation}
      />
    );
  }
  
  // Current values for display
  const currentSpeed = features?.speed_kmh || 0;
  const currentPower = prediction?.battery_power_kw || 0;
  const currentAcceleration = features?.acceleration || 0;
  const currentSlope = features?.slope || 0;
  const currentSOC = tripState.currentSOC;
  const batteryCapacity = BATTERY_CAPACITY[tripConfig?.vehicle] || 78.8;
  const efficiency = currentSpeed > 5 
    ? Math.abs(currentPower / currentSpeed * 100) 
    : 0;
  
  const estimatedRange = calculateRange(currentSOC, tripConfig?.vehicle, tripState.avgEfficiency);
  
  // Render Dashboard
  return (
    <div className="min-h-screen bg-ev-dark text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-ev-dark via-ev-dark/95 to-transparent">
        <div className="flex items-center justify-between px-3 py-2 safe-area-top">
          {/* Back Button */}
          <button 
            onClick={handleBackToSetup}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            <StatusBadge 
              status={
                gpsData.error ? 'error' : 
                gpsData.permissionStatus === 'denied' ? 'error' :
                gpsData.position ? 'success' : 'warning'
              }
              icon={useSimulation ? <Cpu className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
              label={
                useSimulation ? 'SIM' : 
                gpsData.permissionStatus === 'denied' ? '⛔' :
                gpsData.position ? 'GPS' : '⏳'
              }
              pulse={tripState.isActive && !!gpsData.position}
            />
            <StatusBadge 
              status={predictionError ? 'warning' : prediction ? 'success' : 'info'}
              icon={<Activity className="w-3 h-3" />}
              label={prediction?.model_used?.includes('ML') ? 'ML' : 'PHY'}
              pulse={!!prediction}
            />
          </div>
          
          {/* Trip Timer */}
          {tripState.startTime && (
            <div className="text-xs font-mono text-gray-400">
              {formatDuration(Date.now() - tripState.startTime)}
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-14 pb-24 px-3 safe-area-x">
        {/* RECOMMENDATION - Prominent at TOP */}
        <section className="mb-3">
          <RecommendationCard 
            power={currentPower}
            speed={currentSpeed}
            slope={currentSlope}
            acceleration={currentAcceleration}
            efficiency={efficiency}
            compact={true}
          />
        </section>
        
        {/* GPS Error/Waiting Banners */}
        {!useSimulation && gpsData.error && (
          <section className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-red-400">GPS Error</p>
                <p className="text-xs text-red-300/80">{gpsData.error}</p>
              </div>
            </div>
          </section>
        )}
        
        {!useSimulation && !gpsData.position && !gpsData.error && tripState.isActive && (
          <section className="mb-3 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-semibold text-sm text-yellow-400">Searching for GPS...</p>
                <p className="text-xs text-yellow-300/80">Allow location access if prompted</p>
              </div>
            </div>
          </section>
        )}

        {/* MAIN DASHBOARD - Desktop: 3 columns (Speed | Accel | Slope), Mobile: stacked */}
        <section className="mb-3">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 backdrop-blur-sm border border-white/5">
            {/* Desktop Layout: 3 columns */}
            <div className="hidden md:grid md:grid-cols-3 md:gap-6 md:items-center">
              {/* LEFT - Speed Gauge (larger on desktop) */}
              <div className="flex flex-col items-center">
                <SpeedGauge 
                  speed={currentSpeed}
                  recommendedSpeed={prediction?.optimal_speed || 80}
                  maxSpeed={180}
                  size={200}
                />
                {/* Power indicator below speed */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-2xl font-bold ${currentPower < 0 ? 'text-ev-blue' : currentPower > 50 ? 'text-ev-orange' : 'text-ev-green'}`}>
                    {currentPower >= 0 ? '+' : ''}{currentPower.toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-500">kW</span>
                  {efficiency > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({efficiency.toFixed(1)} kWh/100km)
                    </span>
                  )}
                </div>
              </div>
              
              {/* MIDDLE - Acceleration */}
              <div className="flex flex-col justify-center">
                <AccelerationBar 
                  acceleration={currentAcceleration}
                  maxAccel={3}
                  maxDecel={-4}
                />
              </div>
              
              {/* RIGHT - Slope/Grade */}
              <div className="flex flex-col justify-center">
                <SlopeIndicator 
                  slope={currentSlope}
                  maxSlope={15}
                />
              </div>
            </div>
            
            {/* Mobile Layout: Speed centered, then accel/slope side by side */}
            <div className="md:hidden">
              {/* Speed Gauge - Centered */}
              <div className="flex flex-col items-center mb-4">
                <SpeedGauge 
                  speed={currentSpeed}
                  recommendedSpeed={prediction?.optimal_speed || 80}
                  maxSpeed={180}
                  size={160}
                />
                {/* Power indicator below speed */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xl font-bold ${currentPower < 0 ? 'text-ev-blue' : currentPower > 50 ? 'text-ev-orange' : 'text-ev-green'}`}>
                    {currentPower >= 0 ? '+' : ''}{currentPower.toFixed(0)}
                  </span>
                  <span className="text-xs text-gray-500">kW</span>
                  {efficiency > 0 && (
                    <span className="text-[10px] text-gray-500 ml-1">
                      • {efficiency.toFixed(1)} kWh/100km
                    </span>
                  )}
                </div>
              </div>
              
              {/* Acceleration & Slope - Side by side on mobile */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <AccelerationBar 
                    acceleration={currentAcceleration}
                    maxAccel={3}
                    maxDecel={-4}
                  />
                </div>
                <div>
                  <SlopeIndicator 
                    slope={currentSlope}
                    maxSlope={15}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Battery Indicator - Below the main dashboard */}
        <section className="mb-3">
          <BatteryIndicator 
            soc={currentSOC}
            estimatedRange={estimatedRange}
            efficiency={efficiency}
            isCharging={currentPower < -5}
            batteryCapacity={batteryCapacity}
          />
          {/* SOC Change */}
          {tripState.initialSOC !== tripState.currentSOC && (
            <div className="mt-1 text-center text-[10px] text-gray-500">
              <span className="text-ev-orange">
                -{(tripState.initialSOC - tripState.currentSOC).toFixed(1)}%
              </span>
              {' '}since start ({tripState.initialSOC}% → {currentSOC.toFixed(1)}%)
            </div>
          )}
        </section>
        
        {/* Trip Statistics */}
        <section className="mb-3">
          <TripStats 
            distance={tripState.distance}
            energyUsed={tripState.energyUsed}
            avgEfficiency={tripState.avgEfficiency}
            duration={tripState.startTime ? Date.now() - tripState.startTime : 0}
          />
        </section>
        
        {/* Charts Section (Collapsible) */}
        <section className="mb-3">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-ev-blue" />
              <span className="text-sm font-medium">Real-time Charts</span>
              <span className="text-[10px] text-ev-green font-mono">
                ({powerHistory.length} pts)
              </span>
            </div>
            {showCharts ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {showCharts && (
            <div className="mt-2 space-y-2 animate-slide-up">
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-3 backdrop-blur-sm border border-white/5">
                <h3 className="text-xs font-medium text-gray-400 mb-2">
                  Power (kW)
                </h3>
                <PowerHistory data={powerHistory} />
              </div>
              
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-3 backdrop-blur-sm border border-white/5">
                <h3 className="text-xs font-medium text-gray-400 mb-2">
                  Speed (km/h)
                </h3>
                <SpeedHistory data={speedHistory} />
              </div>
            </div>
          )}
        </section>
        
        {/* Debug Info (Collapsible) */}
        <details className="mb-3">
          <summary className="text-[10px] text-gray-600 cursor-pointer">Debug Info</summary>
          <div className="mt-2 p-2 bg-black/50 rounded-lg text-[10px] font-mono text-gray-500">
            <div className="grid grid-cols-2 gap-1">
              <div>Mode: {useSimulation ? '🎮 Sim' : '📍 GPS'}</div>
              <div>Vehicle: {tripConfig?.vehicle || 'BEV2'}</div>
              <div>Speed: {currentSpeed.toFixed(1)} km/h</div>
              <div>Power: {currentPower.toFixed(1)} kW</div>
              <div>Slope: {currentSlope.toFixed(1)}%</div>
              <div>SOC: {currentSOC.toFixed(1)}%</div>
              <div>Model: {prediction?.model_used || 'N/A'}</div>
              <div>Elevation: {stats?.elevationSource || 'N/A'}</div>
              <div>Charts: {powerHistory.length} pts</div>
            </div>
          </div>
        </details>
      </main>
      
      {/* Bottom Control Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-ev-dark via-ev-dark to-transparent pb-safe">
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          {tripState.isActive ? (
            <button
              onClick={handleStopTrip}
              className="flex items-center gap-2 px-6 py-3 bg-ev-red/20 text-ev-red rounded-xl font-semibold hover:bg-ev-red/30 transition-all active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
          ) : (
            <>
              <button
                onClick={handleResumeTrip}
                className="flex items-center gap-2 px-6 py-3 bg-ev-green/20 text-ev-green rounded-xl font-semibold hover:bg-ev-green/30 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>
              <button
                onClick={handleBackToSetup}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                New
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

// Helper function to format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// Helper function to calculate range
function calculateRange(soc, vehicle, currentEfficiency) {
  const capacity = vehicle === 'BEV2' ? 78.8 : 60.5;
  const efficiency = currentEfficiency > 5 ? currentEfficiency : 18;
  const usableEnergy = capacity * (soc / 100) * 0.9;
  return Math.round(usableEnergy / efficiency * 100);
}