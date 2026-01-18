/**
 * EV Energy Prediction Dashboard - Main Application (COMPLETE FIXED VERSION)
 * 
 * Corrections:
 * 1. usePrediction hook properly integrated with auto-prediction
 * 2. History arrays properly populated for charts
 * 3. DYNAMIC SOC that decreases based on energy consumption
 * 4. Better state management
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
  BEV1: 60.5,  // kWh - Tesla Model Y SR (LFP)
  BEV2: 78.8,  // kWh - Tesla Model Y LR (NCA)
};

// Trip state management - NOW INCLUDES DYNAMIC SOC
const initialTripState = {
  isActive: false,
  startTime: null,
  distance: 0,
  energyUsed: 0,
  avgEfficiency: 0,
  currentSOC: 75,      // ✅ Dynamic SOC that decreases
  initialSOC: 75,      // Store initial for reference
};

export default function App() {
  // Application state
  const [screen, setScreen] = useState('setup'); // 'setup' | 'dashboard'
  const [tripConfig, setTripConfig] = useState(null);
  const [tripState, setTripState] = useState(initialTripState);
  const [showCharts, setShowCharts] = useState(true);
  const [useSimulation, setUseSimulation] = useState(true);
  
  // Data history for charts (last 60 seconds)
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
  
  // ML Prediction
  const { prediction, isLoading: predictionLoading, error: predictionError } = usePrediction({
    features,
    vehicleId: tripConfig?.vehicle || 'BEV1',
    enabled: tripState.isActive && features !== null,
  });
  
  // ============================================
  // Update history for charts
  // ============================================
  useEffect(() => {
    if (!tripState.isActive) return;
    
    const hasPrediction = prediction && typeof prediction.battery_power_kw === 'number';
    const hasFeatures = features && typeof features.speed_kmh === 'number';
    
    if (!hasPrediction && !hasFeatures) return;
    
    const timestamp = Date.now();
    const powerValue = hasPrediction ? prediction.battery_power_kw : 0;
    const speedValue = hasFeatures ? features.speed_kmh : 0;
    const optimalSpeed = hasPrediction ? (prediction.optimal_speed || 80) : 80;
    
    // Add to power history
    historyRef.current.power.push({
      time: timestamp,
      value: powerValue,
      optimal: powerValue > 0 ? powerValue * 0.8 : powerValue,
    });
    
    // Add to speed history  
    historyRef.current.speed.push({
      time: timestamp,
      value: speedValue,
      recommended: optimalSpeed,
    });
    
    // Keep only last 60 seconds
    const cutoff = timestamp - 60000;
    historyRef.current.power = historyRef.current.power.filter(p => p.time > cutoff);
    historyRef.current.speed = historyRef.current.speed.filter(s => s.time > cutoff);
    
    setPowerHistory([...historyRef.current.power]);
    setSpeedHistory([...historyRef.current.speed]);
    
  }, [prediction, features, tripState.isActive]);
  
  // ============================================
  // ✅ FIXED: Update trip statistics INCLUDING DYNAMIC SOC
  // ============================================
  useEffect(() => {
    if (!tripState.isActive || !features) return;
    
    const powerKw = prediction?.battery_power_kw || 0;
    const speedKmh = features.speed_kmh || 0;
    const batteryCapacity = BATTERY_CAPACITY[tripConfig?.vehicle] || 60.5;
    
    setTripState(prev => {
      // Energy consumed this second (kWh) - only positive consumption
      // Negative power = regeneration (charging)
      const energyDelta = powerKw > 0 ? powerKw / 3600 : 0; // kWh per second
      const regenEnergy = powerKw < 0 ? Math.abs(powerKw) / 3600 : 0;
      
      const newEnergy = prev.energyUsed + energyDelta;
      
      // Distance this second (km)
      const distanceDelta = speedKmh / 3600;
      const newDistance = prev.distance + distanceDelta;
      
      // ✅ DYNAMIC SOC CALCULATION
      // SOC decreases with consumption, increases slightly with regeneration
      const socConsumption = (energyDelta / batteryCapacity) * 100;
      const socRegen = (regenEnergy / batteryCapacity) * 100 * 0.7; // 70% regen efficiency
      const newSOC = Math.max(0, Math.min(100, prev.currentSOC - socConsumption + socRegen));
      
      return {
        ...prev,
        energyUsed: newEnergy,
        distance: newDistance,
        avgEfficiency: newDistance > 0.01 ? (newEnergy / newDistance) * 100 : 0,
        currentSOC: newSOC,  // ✅ SOC now updates dynamically!
      };
    });
  }, [prediction, features, tripState.isActive, tripConfig?.vehicle]);
  
  // Debug logging
  useEffect(() => {
    if (tripState.isActive && prediction) {
      console.log('📊 State:', {
        speed: `${features?.speed_kmh?.toFixed(1)} km/h`,
        power: `${prediction?.battery_power_kw?.toFixed(1)} kW`,
        soc: `${tripState.currentSOC.toFixed(1)}%`,
        charts: `${powerHistory.length} pts`,
      });
    }
  }, [features, prediction, tripState.currentSOC, powerHistory.length, tripState.isActive]);
  
  // Handle trip start
  const handleStartTrip = useCallback((config) => {
    console.log('🚗 Starting trip with config:', config);
    setTripConfig(config);
    setScreen('dashboard');
    
    // Clear history
    historyRef.current = { power: [], speed: [] };
    setPowerHistory([]);
    setSpeedHistory([]);
    resetFeatures();
    
    // Start trip with initial SOC from config
    const initialSOC = config.soc || 75;
    setTripState({
      isActive: true,
      startTime: Date.now(),
      distance: 0,
      energyUsed: 0,
      avgEfficiency: 0,
      currentSOC: initialSOC,   // ✅ Start with user-selected SOC
      initialSOC: initialSOC,
    });
  }, [resetFeatures]);
  
  // Handle trip stop
  const handleStopTrip = useCallback(() => {
    console.log('🛑 Stopping trip');
    setTripState(prev => ({ ...prev, isActive: false }));
  }, []);
  
  // Handle trip resume
  const handleResumeTrip = useCallback(() => {
    console.log('▶️ Resuming trip');
    setTripState(prev => ({ ...prev, isActive: true }));
  }, []);
  
  // Handle back to setup
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
  const currentSOC = tripState.currentSOC;  // ✅ Now dynamic!
  const batteryCapacity = BATTERY_CAPACITY[tripConfig?.vehicle] || 60.5;
  const efficiency = currentSpeed > 5 
    ? Math.abs(currentPower / currentSpeed * 100) 
    : 0;
  
  // Calculate estimated range based on current efficiency
  const estimatedRange = calculateRange(currentSOC, tripConfig?.vehicle, tripState.avgEfficiency);
  
  // Render Dashboard
  return (
    <div className="min-h-screen bg-ev-dark text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-ev-dark to-transparent">
        <div className="flex items-center justify-between px-4 py-3 safe-area-top">
          {/* Back Button */}
          <button 
            onClick={handleBackToSetup}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-3">
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
              label={prediction?.model_used?.includes('Local') ? 'LOCAL' : 'ML'}
              pulse={!!prediction}
            />
          </div>
          
          {/* Trip Timer */}
          {tripState.startTime && (
            <div className="text-sm font-mono text-gray-400">
              {formatDuration(Date.now() - tripState.startTime)}
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-16 pb-32 px-4 safe-area-x">
        {/* GPS Error Banner */}
        {!useSimulation && gpsData.error && (
          <section className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-400">Erreur GPS</p>
                <p className="text-sm text-red-300/80">{gpsData.error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 text-xs text-red-400 underline"
                >
                  Recharger la page
                </button>
              </div>
            </div>
          </section>
        )}
        
        {/* GPS Waiting Banner */}
        {!useSimulation && !gpsData.position && !gpsData.error && tripState.isActive && (
          <section className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-semibold text-yellow-400">Recherche du signal GPS...</p>
                <p className="text-sm text-yellow-300/80">
                  Autorisez l'accès à la localisation si demandé
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Primary Metrics - Speed & Power */}
        <section className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 backdrop-blur-sm border border-white/5">
            <SpeedGauge 
              speed={currentSpeed}
              recommendedSpeed={prediction?.optimal_speed || 80}
              maxSpeed={180}
            />
          </div>
          
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 backdrop-blur-sm border border-white/5">
            <PowerGauge 
              power={currentPower}
              maxPower={150}
              maxRegen={-80}
              efficiency={efficiency}
            />
          </div>
        </section>
        
        {/* ✅ Battery Indicator - NOW WITH DYNAMIC SOC */}
        <section className="mb-6">
          <BatteryIndicator 
            soc={currentSOC}
            estimatedRange={estimatedRange}
            efficiency={efficiency}
            isCharging={currentPower < -5}
            batteryCapacity={batteryCapacity}
          />
          {/* SOC Change Indicator */}
          {tripState.initialSOC !== tripState.currentSOC && (
            <div className="mt-2 text-center text-xs text-gray-500">
              <span className="text-ev-orange">
                -{(tripState.initialSOC - tripState.currentSOC).toFixed(1)}%
              </span>
              {' '}depuis le départ ({tripState.initialSOC}% → {currentSOC.toFixed(1)}%)
            </div>
          )}
        </section>
        
        {/* Secondary Metrics */}
        <section className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 backdrop-blur-sm border border-white/5">
            <AccelerationBar 
              acceleration={currentAcceleration}
              maxAccel={3}
              maxDecel={-4}
            />
          </div>
          
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 backdrop-blur-sm border border-white/5">
            <SlopeIndicator 
              slope={currentSlope}
              maxSlope={15}
            />
          </div>
        </section>
        
        {/* Recommendation Card */}
        <section className="mb-6">
          <RecommendationCard 
            power={currentPower}
            speed={currentSpeed}
            slope={currentSlope}
            acceleration={currentAcceleration}
            efficiency={efficiency}
          />
        </section>
        
        {/* Trip Statistics */}
        <section className="mb-6">
          <TripStats 
            distance={tripState.distance}
            energyUsed={tripState.energyUsed}
            avgEfficiency={tripState.avgEfficiency}
            duration={tripState.startTime ? Date.now() - tripState.startTime : 0}
          />
        </section>
        
        {/* Charts Section */}
        <section className="mb-6">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-ev-blue" />
              <span className="font-medium">Graphiques en temps réel</span>
              <span className="text-xs text-ev-green font-mono">
                ({powerHistory.length} points)
              </span>
            </div>
            {showCharts ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {showCharts && (
            <div className="mt-4 space-y-4 animate-slide-up">
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Puissance (kW) - {powerHistory.length > 0 ? `${currentPower.toFixed(1)} kW` : 'En attente...'}
                </h3>
                <PowerHistory data={powerHistory} />
              </div>
              
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Vitesse (km/h) - {speedHistory.length > 0 ? `${currentSpeed.toFixed(1)} km/h` : 'En attente...'}
                </h3>
                <SpeedHistory data={speedHistory} />
              </div>
            </div>
          )}
        </section>
        
        {/* Debug Info */}
        <section className="mb-6 p-4 bg-black/50 rounded-xl text-xs font-mono text-gray-500">
          <div className="flex items-center justify-between mb-2">
            <span>Debug Info</span>
            <button 
              onClick={() => console.log({ features, prediction, gpsData, tripState })}
              className="text-ev-blue hover:underline"
            >
              Log State
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>Mode: {useSimulation ? '🎮 Simulation' : '📍 GPS Réel'}</div>
            <div>GPS: {
              gpsData.error ? '❌ Erreur' :
              gpsData.position ? '✅ Actif' : '⏳ Attente'
            }</div>
            {!useSimulation && (
              <>
                <div>Permission: {gpsData.permissionStatus || 'unknown'}</div>
                <div>Précision: {gpsData.position?.accuracy?.toFixed(0) || '-'}m</div>
              </>
            )}
            <div>Speed: {currentSpeed.toFixed(1)} km/h</div>
            <div>Power: {currentPower.toFixed(1)} kW</div>
            <div className="text-ev-green">SOC: {currentSOC.toFixed(1)}%</div>
            <div>Energy: {tripState.energyUsed.toFixed(3)} kWh</div>
            <div>Distance: {(tripState.distance * 1000).toFixed(0)} m</div>
            <div>Charts: {powerHistory.length} pts</div>
          </div>
          {gpsData.error && (
            <div className="mt-2 text-red-400 border-t border-white/10 pt-2">
              Erreur: {gpsData.error}
            </div>
          )}
        </section>
      </main>
      
      {/* Bottom Control Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-ev-dark via-ev-dark to-transparent pb-safe">
        <div className="flex items-center justify-center gap-6 px-4 py-4">
          {tripState.isActive ? (
            <button
              onClick={handleStopTrip}
              className="flex items-center gap-2 px-8 py-4 bg-ev-red/20 text-ev-red rounded-2xl font-semibold hover:bg-ev-red/30 transition-all active:scale-95"
            >
              <Square className="w-5 h-5 fill-current" />
              Arrêter
            </button>
          ) : (
            <>
              <button
                onClick={handleResumeTrip}
                className="flex items-center gap-2 px-8 py-4 bg-ev-green/20 text-ev-green rounded-2xl font-semibold hover:bg-ev-green/30 transition-all active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Reprendre
              </button>
              <button
                onClick={handleBackToSetup}
                className="flex items-center gap-2 px-6 py-4 bg-white/10 text-white rounded-2xl font-semibold hover:bg-white/20 transition-all active:scale-95"
              >
                <RefreshCw className="w-5 h-5" />
                Nouveau
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

// Helper function to calculate range based on current efficiency
function calculateRange(soc, vehicle, currentEfficiency) {
  const capacity = vehicle === 'BEV2' ? 78.8 : 60.5; // kWh
  
  // Use current trip efficiency if available, otherwise default
  const efficiency = currentEfficiency > 5 ? currentEfficiency : 18; // kWh/100km
  
  const usableEnergy = capacity * (soc / 100) * 0.9; // 90% usable
  return Math.round(usableEnergy / efficiency * 100);
}
