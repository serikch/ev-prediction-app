/**
 * InitialForm - Trip Configuration Screen
 * 
 * FIXED VERSION:
 * - All text in English
 * - BEV2 as default (model trained on it)
 * - Better mobile slider UX with +/- buttons
 * - Mobile-optimized layout
 */
import { useState, useCallback } from 'react';
import { 
  Battery, 
  Thermometer, 
  Car, 
  Play, 
  Gauge,
  Cpu,
  MapPin,
  Zap,
  Info,
  Minus,
  Plus
} from 'lucide-react';

// Vehicle specifications
const VEHICLES = {
  BEV2: {
    id: 'BEV2',
    name: 'Tesla Model Y LR',
    battery: '78.8 kWh',
    chemistry: 'NCA',
    range: '450 km',
    icon: '🚙',
  },
  BEV1: {
    id: 'BEV1',
    name: 'Tesla Model Y SR',
    battery: '60.5 kWh',
    chemistry: 'LFP',
    range: '350 km',
    icon: '🚗',
  },
};

export default function InitialForm({ onStart, useSimulation, onSimulationToggle }) {
  const [soc, setSOC] = useState(75);
  const [temperature, setTemperature] = useState(18);
  const [vehicle, setVehicle] = useState('BEV2'); // Default to BEV2
  const [isLoading, setIsLoading] = useState(false);
  
  const handleStart = useCallback(async () => {
    setIsLoading(true);
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onStart({
      soc,
      temperature,
      vehicle,
      batteryCapacity: vehicle === 'BEV2' ? 78.8 : 60.5,
    });
  }, [soc, temperature, vehicle, onStart]);
  
  const selectedVehicle = VEHICLES[vehicle];

  // Helper for adjusting values with buttons (better mobile UX)
  const adjustSOC = (delta) => {
    setSOC(prev => Math.max(5, Math.min(100, prev + delta)));
  };

  const adjustTemp = (delta) => {
    setTemperature(prev => Math.max(-20, Math.min(40, prev + delta)));
  };
  
  return (
    <div className="min-h-screen bg-ev-dark text-white flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-4 safe-area-top">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ev-green to-ev-blue flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              EV Energy Predictor
            </h1>
            <p className="text-xs text-gray-500">Intelligent consumption prediction</p>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 px-4 pb-safe overflow-y-auto space-y-4">
        {/* Simulation Toggle */}
        <section>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-ev-blue/10 to-ev-green/10 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                useSimulation ? 'bg-ev-orange/20' : 'bg-ev-green/20'
              }`}>
                {useSimulation ? (
                  <Cpu className="w-5 h-5 text-ev-orange" />
                ) : (
                  <MapPin className="w-5 h-5 text-ev-green" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {useSimulation ? 'Simulation Mode' : 'Real GPS'}
                </p>
                <p className="text-xs text-gray-500">
                  {useSimulation 
                    ? 'Simulated trip for testing' 
                    : 'Uses real location'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onSimulationToggle(!useSimulation)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                useSimulation ? 'bg-ev-orange' : 'bg-ev-green'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform ${
                useSimulation ? 'left-1' : 'left-7'
              }`} />
            </button>
          </div>
        </section>
        
        {/* Vehicle Selection */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Car className="w-4 h-4" />
            Vehicle
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(VEHICLES).map((v) => (
              <button
                key={v.id}
                onClick={() => setVehicle(v.id)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  vehicle === v.id
                    ? 'border-ev-green bg-ev-green/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-1">{v.icon}</div>
                <p className="font-semibold text-xs">{v.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{v.battery} ({v.chemistry})</p>
                <p className="text-[10px] text-ev-green">~{v.range}</p>
                {v.id === 'BEV2' && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-ev-blue/20 text-ev-blue text-[8px] rounded-full">
                    ML Model
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
        
        {/* Battery SOC with +/- buttons for mobile */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Initial Charge
            </h2>
            <span className="text-xl font-bold text-ev-green">{soc}%</span>
          </div>
          
          {/* Mobile-friendly controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustSOC(-5)}
              className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-ev-red via-ev-orange to-ev-green rounded-full transition-all duration-300"
                  style={{ width: `${soc}%` }}
                />
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={soc}
                onChange={(e) => setSOC(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            
            <button
              onClick={() => adjustSOC(5)}
              className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {/* Quick select buttons */}
          <div className="flex gap-2 mt-2">
            {[20, 50, 80, 100].map(val => (
              <button
                key={val}
                onClick={() => setSOC(val)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  soc === val ? 'bg-ev-green text-black' : 'bg-white/5 text-gray-400'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
          
          {/* Estimated Range */}
          <div className="mt-3 p-2 bg-white/5 rounded-lg flex items-center justify-between">
            <span className="text-xs text-gray-400">Estimated range</span>
            <span className="font-semibold text-sm text-ev-blue">
              ~{Math.round(
                (vehicle === 'BEV2' ? 78.8 : 60.5) * (soc / 100) * 0.9 / 18 * 100
              )} km
            </span>
          </div>
        </section>
        
        {/* Temperature with +/- buttons for mobile */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              Ambient Temperature
            </h2>
            <span className={`text-xl font-bold ${
              temperature < 5 ? 'text-ev-blue' :
              temperature > 30 ? 'text-ev-red' :
              'text-ev-green'
            }`}>{temperature}°C</span>
          </div>
          
          {/* Mobile-friendly controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustTemp(-5)}
              className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <div className="h-3 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-full opacity-30" />
              <div 
                className="absolute top-0 w-4 h-3 bg-white rounded-full shadow-lg transition-all duration-300"
                style={{ left: `calc(${((temperature + 20) / 60) * 100}% - 8px)` }}
              />
              <input
                type="range"
                min="-20"
                max="40"
                step="5"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            
            <button
              onClick={() => adjustTemp(5)}
              className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {/* Quick select buttons */}
          <div className="flex gap-2 mt-2">
            {[-10, 5, 20, 35].map(val => (
              <button
                key={val}
                onClick={() => setTemperature(val)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  temperature === val ? 'bg-ev-green text-black' : 'bg-white/5 text-gray-400'
                }`}
              >
                {val}°C
              </button>
            ))}
          </div>
          
          {/* Temperature Impact Info */}
          <div className="mt-3 p-2 bg-white/5 rounded-lg flex items-start gap-2">
            <Info className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-gray-500">
              {temperature < 5 
                ? 'Low temps: +15-25% consumption (battery heating)'
                : temperature > 30
                ? 'High temps: +10-15% consumption (AC)'
                : 'Ideal temperature for maximum efficiency'}
            </p>
          </div>
        </section>
        
        {/* Info Card */}
        <section>
          <div className="p-3 bg-gradient-to-br from-white/5 to-transparent rounded-xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-ev-blue/20 flex items-center justify-center flex-shrink-0">
                <Gauge className="w-5 h-5 text-ev-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Hybrid ML Model</h3>
                <p className="text-xs text-gray-400">
                  Combines physics model with Machine Learning (XGBoost) 
                  for accurate consumption predictions.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-ev-green" />
                    36 features
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-ev-blue" />
                    MAPE &lt; 8%
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-ev-orange" />
                    1 Hz
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Start Button */}
      <footer className="px-4 pb-6 pt-3 safe-area-bottom bg-gradient-to-t from-ev-dark via-ev-dark to-transparent">
        <button
          onClick={handleStart}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
            isLoading
              ? 'bg-gray-700 text-gray-400 cursor-wait'
              : 'bg-gradient-to-r from-ev-green to-ev-blue text-white shadow-lg shadow-ev-green/20 hover:shadow-ev-green/40'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              Start Trip
            </>
          )}
        </button>
        
        <p className="text-center text-[10px] text-gray-600 mt-2">
          {useSimulation 
            ? 'The simulator will generate a realistic trip'
            : 'Make sure GPS is enabled'}
        </p>
      </footer>
    </div>
  );
}