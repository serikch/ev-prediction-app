/**
 * InitialForm - Trip Configuration Screen
 * 
 * Allows users to configure their trip before starting:
 * - Initial battery SOC
 * - Ambient temperature
 * - Vehicle selection
 * - Simulation mode toggle
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
  Info
} from 'lucide-react';

// Vehicle specifications
const VEHICLES = {
  BEV1: {
    id: 'BEV1',
    name: 'Tesla Model Y SR',
    battery: '60.5 kWh',
    chemistry: 'LFP',
    range: '350 km',
    icon: 'ðŸš—',
  },
  BEV2: {
    id: 'BEV2',
    name: 'Tesla Model Y LR',
    battery: '78.8 kWh',
    chemistry: 'NCA',
    range: '450 km',
    icon: 'ðŸš™',
  },
};

export default function InitialForm({ onStart, useSimulation, onSimulationToggle }) {
  const [soc, setSOC] = useState(75);
  const [temperature, setTemperature] = useState(18);
  const [vehicle, setVehicle] = useState('BEV1');
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
  
  return (
    <div className="min-h-screen bg-ev-dark text-white flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-8 safe-area-top">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ev-green to-ev-blue flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              EV Energy Predictor
            </h1>
            <p className="text-sm text-gray-500">PrÃ©diction intelligente de consommation</p>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 px-6 pb-safe overflow-y-auto">
        {/* Simulation Toggle */}
        <section className="mb-8">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-ev-blue/10 to-ev-green/10 rounded-2xl border border-white/10">
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
                <p className="font-medium">
                  {useSimulation ? 'Mode Simulation' : 'GPS RÃ©el'}
                </p>
                <p className="text-xs text-gray-500">
                  {useSimulation 
                    ? 'Trajet simulÃ© pour tests' 
                    : 'Utilise la position rÃ©elle'}
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
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Car className="w-4 h-4" />
            VÃ©hicule
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.values(VEHICLES).map((v) => (
              <button
                key={v.id}
                onClick={() => setVehicle(v.id)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  vehicle === v.id
                    ? 'border-ev-green bg-ev-green/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="text-3xl mb-2">{v.icon}</div>
                <p className="font-semibold text-sm">{v.name}</p>
                <p className="text-xs text-gray-500 mt-1">{v.battery} ({v.chemistry})</p>
                <p className="text-xs text-ev-green mt-1">~{v.range}</p>
              </button>
            ))}
          </div>
        </section>
        
        {/* Battery SOC */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Ã‰tat de charge initial
            </h2>
            <span className="text-2xl font-bold text-ev-green">{soc}%</span>
          </div>
          
          <div className="relative">
            {/* Track */}
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-ev-red via-ev-orange to-ev-green rounded-full transition-all duration-300"
                style={{ width: `${soc}%` }}
              />
            </div>
            
            {/* Slider */}
            <input
              type="range"
              min="5"
              max="100"
              value={soc}
              onChange={(e) => setSOC(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {/* Labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>5%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          {/* Estimated Range */}
          <div className="mt-4 p-3 bg-white/5 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-400">Autonomie estimÃ©e</span>
            <span className="font-semibold text-ev-blue">
              ~{Math.round(
                (vehicle === 'BEV2' ? 78.8 : 60.5) * (soc / 100) * 0.9 / 18 * 100
              )} km
            </span>
          </div>
        </section>
        
        {/* Temperature */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              TempÃ©rature ambiante
            </h2>
            <span className={`text-2xl font-bold ${
              temperature < 5 ? 'text-ev-blue' :
              temperature > 30 ? 'text-ev-red' :
              'text-ev-green'
            }`}>{temperature}Â°C</span>
          </div>
          
          <div className="relative">
            {/* Track with gradient */}
            <div className="h-3 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-full overflow-hidden opacity-30" />
            
            {/* Slider position indicator */}
            <div 
              className="absolute top-0 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-300"
              style={{ left: `calc(${((temperature + 20) / 60) * 100}% - 6px)` }}
            />
            
            {/* Slider */}
            <input
              type="range"
              min="-20"
              max="40"
              value={temperature}
              onChange={(e) => setTemperature(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {/* Labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>-20Â°C</span>
              <span>10Â°C</span>
              <span>40Â°C</span>
            </div>
          </div>
          
          {/* Temperature Impact Info */}
          <div className="mt-4 p-3 bg-white/5 rounded-xl flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              {temperature < 5 
                ? 'TempÃ©ratures basses : consommation +15-25% (chauffage batterie)'
                : temperature > 30
                ? 'TempÃ©ratures Ã©levÃ©es : consommation +10-15% (climatisation)'
                : 'TempÃ©rature idÃ©ale pour l\'efficacitÃ© maximale'}
            </p>
          </div>
        </section>
        
        {/* Info Card */}
        <section className="mb-8">
          <div className="p-4 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-ev-blue/20 flex items-center justify-center flex-shrink-0">
                <Gauge className="w-5 h-5 text-ev-blue" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">ModÃ¨le ML Hybride</h3>
                <p className="text-sm text-gray-400">
                  Combine un modÃ¨le physique (dynamique vÃ©hicule) avec une correction 
                  Machine Learning (XGBoost) pour des prÃ©dictions prÃ©cises de consommation.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-ev-green" />
                    36 features
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-ev-blue" />
                    MAPE &lt; 8%
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-ev-orange" />
                    1 Hz
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Start Button */}
      <footer className="px-6 pb-8 pt-4 safe-area-bottom bg-gradient-to-t from-ev-dark via-ev-dark to-transparent">
        <button
          onClick={handleStart}
          disabled={isLoading}
          className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
            isLoading
              ? 'bg-gray-700 text-gray-400 cursor-wait'
              : 'bg-gradient-to-r from-ev-green to-ev-blue text-white shadow-lg shadow-ev-green/20 hover:shadow-ev-green/40'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Initialisation...
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              DÃ©marrer le trajet
            </>
          )}
        </button>
        
        <p className="text-center text-xs text-gray-600 mt-4">
          {useSimulation 
            ? 'Le simulateur gÃ©nÃ©rera un trajet rÃ©aliste'
            : 'Assurez-vous que le GPS est activÃ©'}
        </p>
      </footer>
    </div>
  );
}
