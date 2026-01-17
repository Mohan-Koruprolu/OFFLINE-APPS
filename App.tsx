
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Member, AppState, UserLocation, POI, Breadcrumb } from './types';
import { generateMockMember, updateMemberDistance } from './services/bluetoothSimulator';
import { Radar } from './components/Radar';
import { MemberCard } from './components/MemberCard';
import { TrailNavigator } from './components/TrailNavigator';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'mesh',
    isScanning: false,
    isRecordingTrail: false,
    isTestMode: false,
    safeDistance: 25,
    calibrationOffset: 0,
    members: [],
    userName: "Central Node",
    userLocation: null,
    breadcrumbs: [],
    pois: [],
    highlightedMemberId: null
  });

  const [btSupported, setBtSupported] = useState<boolean>(true);
  const [isAppleMobile, setIsAppleMobile] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [systemDevices, setSystemDevices] = useState<any[]>([]);
  const [showPairedModal, setShowPairedModal] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  
  const scanIntervalRef = useRef<number | null>(null);
  const breadcrumbIntervalRef = useRef<number | null>(null);

  const checkPlatform = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const standalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    setIsAppleMobile(isIOS);
    setIsStandalone(standalone);
    
    if (!('bluetooth' in navigator)) {
      setBtSupported(false);
      if (isIOS && !standalone) {
        setShowInstallGuide(true);
      }
    }
  }, []);

  const updateSystemDevices = useCallback(async () => {
    if ('bluetooth' in navigator && (navigator.bluetooth as any).getDevices) {
      try {
        const devices = await (navigator.bluetooth as any).getDevices();
        setSystemDevices(devices);
      } catch (err) {
        console.error("Error fetching system devices:", err);
      }
    }
  }, []);

  useEffect(() => {
    checkPlatform();
    updateSystemDevices();
  }, [checkPlatform, updateSystemDevices]);

  // Connection status derived from sensors
  const connectionStatus = useMemo(() => {
    if (btSupported && state.userLocation) {
      return { label: 'Online', color: 'text-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' };
    }
    if (btSupported || state.userLocation) {
      return { label: 'Limited Connectivity', color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' };
    }
    return { label: 'Offline', color: 'text-red-500', bg: 'bg-red-500/10', dot: 'bg-red-500' };
  }, [btSupported, state.userLocation]);

  // Geolocation watch
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setState(prev => ({
            ...prev,
            userLocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude
            }
          }));
        },
        (error) => console.error("Location error:", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Breadcrumb recording logic
  useEffect(() => {
    if (state.isRecordingTrail) {
      breadcrumbIntervalRef.current = window.setInterval(() => {
        setState(prev => {
          if (!prev.userLocation) return prev;
          const newBreadcrumb: Breadcrumb = {
            lat: prev.userLocation.latitude,
            lng: prev.userLocation.longitude,
            timestamp: Date.now()
          };
          const last = prev.breadcrumbs[prev.breadcrumbs.length - 1];
          if (!last || Math.abs(last.lat - newBreadcrumb.lat) > 0.00001 || Math.abs(last.lng - newBreadcrumb.lng) > 0.00001) {
             return { ...prev, breadcrumbs: [...prev.breadcrumbs, newBreadcrumb] };
          }
          return prev;
        });
      }, 5000);
    } else {
      if (breadcrumbIntervalRef.current) clearInterval(breadcrumbIntervalRef.current);
    }
    return () => { if (breadcrumbIntervalRef.current) clearInterval(breadcrumbIntervalRef.current); };
  }, [state.isRecordingTrail]);

  const dropPin = (type: POI['type']) => {
    if (!state.userLocation) return;
    const labels = { camp: 'Camp', water: 'Water', danger: 'Danger', generic: 'Mark' };
    const newPoi: POI = {
      id: crypto.randomUUID(),
      lat: state.userLocation.latitude,
      lng: state.userLocation.longitude,
      label: labels[type],
      type
    };
    setState(prev => ({ ...prev, pois: [...prev.pois, newPoi] }));
  };

  const playAlert = useCallback((type: 'distance' | 'battery' | 'test') => {
    if ("vibrate" in navigator) {
      const pattern = 
        type === 'distance' ? [500, 200, 500] : 
        type === 'battery' ? [100, 100, 100, 100, 500] : 
        [50, 50, 50];
      navigator.vibrate(pattern);
    }
  }, []);

  const requestBluetoothDevice = async () => {
    try {
      if ('bluetooth' in navigator) {
        const device = await (navigator.bluetooth as any).requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            'battery_service', 
            'device_information',
            '0000180f-0000-1000-8000-00805f9b34fb',
            '0000180a-0000-1000-8000-00805f9b34fb'
          ] 
        });
        addDeviceToRegistry(device);
        updateSystemDevices();
      } else {
        setShowPairedModal(true);
      }
    } catch (err) {
      console.warn("Bluetooth pairing stopped:", err);
    }
  };

  const addDeviceToRegistry = (device: any) => {
    setState(prev => {
      if (prev.members.find(m => m.id === device.id)) return prev;
      const newMember: Member = {
        ...generateMockMember(device.id),
        name: device.name || `Device ${device.id.slice(-4)}`,
        status: 'connected',
        distance: 2,
        battery: 100
      };
      return { ...prev, members: [...prev.members, newMember] };
    });
  };

  const toggleScanning = () => {
    if (!btSupported && !state.isTestMode) {
      setShowPairedModal(true);
      return;
    }
    setState(prev => ({ ...prev, isScanning: !prev.isScanning }));
  };

  const toggleRecording = () => {
    setState(prev => ({ ...prev, isRecordingTrail: !prev.isRecordingTrail }));
  };

  const toggleIgnoreMember = (id: string) => {
    setState(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, isIgnored: !m.isIgnored } : m)
    }));
  };

  const removeMember = (id: string) => {
    setState(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id),
      highlightedMemberId: prev.highlightedMemberId === id ? null : prev.highlightedMemberId
    }));
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, safeDistance: parseInt(e.target.value) }));
  };

  const handleCalibrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, calibrationOffset: parseInt(e.target.value) }));
  };

  const selectMember = (id: string) => {
    setState(prev => ({ ...prev, highlightedMemberId: prev.highlightedMemberId === id ? null : id }));
  };

  useEffect(() => {
    if (state.isScanning) {
      scanIntervalRef.current = window.setInterval(() => {
        setState(prev => {
          const updatedMembers = prev.members.map(m => {
            if (m.isIgnored) return m;
            const updated = updateMemberDistance(m);
            const adjustedDistance = Math.max(0.5, updated.distance + prev.calibrationOffset);
            let newStatus: 'connected' | 'warning' | 'lost' = 'connected';
            if (adjustedDistance > prev.safeDistance) newStatus = 'lost';
            else if (adjustedDistance > prev.safeDistance * 0.7) newStatus = 'warning';
            const result = { ...updated, distance: adjustedDistance, status: newStatus };
            if (result.status === 'lost' && m.status !== 'lost') playAlert('distance');
            if (result.battery <= 20 && m.battery > 20) playAlert('battery');
            return result;
          });
          return { ...prev, members: updatedMembers };
        });
      }, 2000);
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [state.isScanning, state.safeDistance, state.isTestMode, state.calibrationOffset, playAlert]);

  const trackedMembers = state.members.filter(m => !m.isIgnored);
  const lostCount = trackedMembers.filter(m => m.status === 'lost').length;
  const lowBatteryCount = trackedMembers.filter(m => m.battery <= 20).length;

  return (
    <div className={`min-h-screen flex flex-col font-sans relative transition-colors duration-500 ${state.isTestMode ? 'bg-slate-950 border-[6px] border-yellow-500/10' : 'bg-slate-950'}`}>
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${state.isTestMode ? 'bg-yellow-500 text-black shadow-yellow-500/20' : 'bg-blue-600 text-white shadow-blue-900/20'}`}>
            <i className={`fa-solid ${state.isTestMode ? 'fa-vial-circle-check' : 'fa-tower-broadcast'} text-xl`} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-lg tracking-tight text-white leading-none">Nomad Mesh</h1>
              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${connectionStatus.bg} ${connectionStatus.color} border-current/20`}>
                <span className={`w-1 h-1 rounded-full ${connectionStatus.dot} animate-pulse`} />
                {connectionStatus.label}
              </span>
            </div>
            <p className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${state.isTestMode ? 'text-yellow-500' : 'text-slate-500'}`}>
              {state.isTestMode ? 'Diagnostic Mode Active' : 'Tactical Nav v3.1'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, isTestMode: !prev.isTestMode }))}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${state.isTestMode ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white'}`}
          >
            Test
          </button>
          
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1 hidden md:flex">
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'mesh' }))}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${state.view === 'mesh' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Radar
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'trail' }))}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${state.view === 'trail' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Trail
            </button>
          </div>
          
          <button 
            onClick={state.view === 'mesh' ? toggleScanning : toggleRecording}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 ${
              (state.view === 'mesh' ? (state.isScanning && (btSupported || state.isTestMode)) : state.isRecordingTrail)
                ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
            }`}
          >
            {state.view === 'mesh' 
              ? (state.isScanning && (btSupported || state.isTestMode) ? 'Stop Mesh' : 'Init Mesh')
              : (state.isRecordingTrail ? 'Stop Rec' : 'Start Rec')
            }
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* iOS Standalone Guide */}
          {showInstallGuide && (
            <div className="bg-blue-600/20 border border-blue-500/40 p-6 rounded-3xl relative overflow-hidden">
               <button 
                 onClick={() => setShowInstallGuide(false)}
                 className="absolute top-4 right-4 text-blue-400 hover:text-white"
               >
                 <i className="fa-solid fa-xmark" />
               </button>
               <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                 <i className="fa-brands fa-apple text-xl" />
                 Tactical App Installation
               </h3>
               <p className="text-xs text-blue-100/80 leading-relaxed mb-4">
                 For a full native experience and **Bluetooth tracking** on iOS, follow these steps:
               </p>
               <div className="space-y-4">
                 <div className="flex gap-4 items-start">
                   <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                   <p className="text-[11px] text-slate-300">Open this URL in the <span className="text-white font-bold">Bluefy Browser</span> (from App Store).</p>
                 </div>
                 <div className="flex gap-4 items-start">
                   <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                   <p className="text-[11px] text-slate-300">Tap the <span className="text-white font-bold">Share</span> button in Bluefy's toolbar.</p>
                 </div>
                 <div className="flex gap-4 items-start">
                   <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                   <p className="text-[11px] text-slate-300">Select <span className="text-white font-bold">"Add to Home Screen"</span> for standalone mesh tracking.</p>
                 </div>
               </div>
               <div className="mt-6 flex gap-3">
                 <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noopener noreferrer" className="flex-1 bg-white text-blue-600 py-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-tighter">
                   Download Bluefy
                 </a>
                 <button onClick={() => setShowInstallGuide(false)} className="flex-1 bg-blue-700/50 text-white py-2.5 rounded-xl text-center text-[10px] font-black uppercase">
                   Dismiss
                 </button>
               </div>
            </div>
          )}

          {state.isTestMode && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-10"><i className="fa-solid fa-wrench text-6xl rotate-12" /></div>
               <div>
                  <h4 className="font-black text-yellow-500 text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    Calibration HUD
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-yellow-500/70 uppercase font-black mb-2">
                        <span>RSSI Offset ({state.calibrationOffset}m)</span>
                      </div>
                      <input type="range" min="-10" max="10" step="1" value={state.calibrationOffset} onChange={handleCalibrationChange} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => playAlert('test')} className="flex-1 py-2 bg-slate-900 border border-yellow-500/20 rounded-xl text-[10px] font-black uppercase text-yellow-500 hover:bg-yellow-500/10 transition-colors">Test Haptics</button>
                      <button onClick={() => state.members.length > 0 && selectMember(state.members[0].id)} className="flex-1 py-2 bg-slate-900 border border-yellow-500/20 rounded-xl text-[10px] font-black uppercase text-yellow-500 hover:bg-yellow-500/10 transition-colors">Force Focus</button>
                    </div>
                  </div>
               </div>
               <div className="bg-slate-950/50 p-4 rounded-2xl border border-yellow-500/10 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Raw Diagnostics</p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                      <span className="text-slate-600">GPS ACC:</span><span className="text-emerald-400">{state.userLocation?.accuracy.toFixed(2) || '---'}m</span>
                      <span className="text-slate-600">NODES:</span><span className="text-blue-400">{state.members.length}</span>
                      <span className="text-slate-600">ENGINE:</span><span className={btSupported ? 'text-emerald-400' : 'text-red-400'}>{btSupported ? 'BLE-API' : 'SIM'}</span>
                    </div>
                  </div>
               </div>
            </div>
          )}

          <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <i className={`fa-solid ${state.view === 'mesh' ? 'fa-location-arrow' : 'fa-compass'} ${state.isTestMode ? 'text-yellow-500' : 'text-blue-500'}`} />
                {state.view === 'mesh' ? 'Live Mesh Radar' : 'Offline Trail Marker'}
              </h2>
            </div>
            {state.view === 'mesh' ? (
              <Radar members={trackedMembers} maxDistance={state.safeDistance * 1.5} highlightedMemberId={state.highlightedMemberId} />
            ) : (
              <TrailNavigator breadcrumbs={state.breadcrumbs} pois={state.pois} currentLocation={state.userLocation} onDropPin={dropPin} />
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">LAT</p><p className="text-sm font-mono text-slate-100">{state.userLocation?.latitude.toFixed(5) || '---'}</p></div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">LNG</p><p className="text-sm font-mono text-slate-100">{state.userLocation?.longitude.toFixed(5) || '---'}</p></div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">ACC</p><p className={`text-sm font-mono ${state.userLocation && state.userLocation.accuracy > 10 ? 'text-yellow-500' : 'text-slate-100'}`}>{state.userLocation?.accuracy.toFixed(1) || '0'}m</p></div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">ALT</p><p className="text-sm font-mono text-slate-100">{state.userLocation?.altitude?.toFixed(0) || '0'}m</p></div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-white">Group Registry</h2>
            <div className="flex gap-2">
              <button 
                onClick={requestBluetoothDevice}
                className={`px-4 py-2 rounded-xl text-white transition-all flex items-center gap-2 text-xs font-bold shadow-lg ${state.isTestMode ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'}`}
              >
                <i className="fa-solid fa-plus" /> Add Node
              </button>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-450px)] pr-2 custom-scrollbar">
            {state.members.length === 0 ? (
              <div className="bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl p-12 flex flex-col items-center text-center">
                <i className={`fa-brands fa-bluetooth-b ${state.isTestMode ? 'text-yellow-500/20' : 'text-slate-700'} text-4xl mb-4`} />
                <h3 className="font-bold text-slate-400 uppercase text-sm tracking-widest">Mesh Idle</h3>
                <p className="text-xs text-slate-600 mt-2">Initialize Mesh to start tracking group safety.</p>
              </div>
            ) : (
              [...state.members].sort((a, b) => (a.id === state.highlightedMemberId ? -1 : 0)).map(member => (
                <MemberCard key={member.id} member={member} isHighlighted={member.id === state.highlightedMemberId} onSelect={selectMember} onToggleIgnore={toggleIgnoreMember} onRemove={removeMember} />
              ))
            )}
          </div>

          {(lowBatteryCount > 0 || lostCount > 0) && (
            <div className="space-y-3">
              {lowBatteryCount > 0 && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                   <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20"><i className="fa-solid fa-battery-quarter text-white" /></div>
                   <div className="flex-1">
                      <h4 className="font-bold text-orange-500 text-sm uppercase">Power Low</h4>
                      <p className="text-orange-300 text-[11px] leading-tight mt-0.5">{lowBatteryCount} nodes critical.</p>
                   </div>
                </div>
              )}
              {lostCount > 0 && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4 animate-bounce">
                   <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20"><i className="fa-solid fa-person-walking-arrow-right text-white" /></div>
                   <div className="flex-1">
                      <h4 className="font-bold text-red-500 text-sm uppercase">Perimeter Breach</h4>
                      <p className="text-red-300 text-[11px] leading-tight mt-0.5">{lostCount} nodes outside safety zone.</p>
                   </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Paired Modal / System Diagnostics */}
      {showPairedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowPairedModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Connectivity Hub</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">GATT & Device Discovery</p>
              </div>
              <button onClick={() => setShowPairedModal(false)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700">
                <i className="fa-solid fa-xmark text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {systemDevices.length === 0 ? (
                <div className="py-8 text-center text-slate-500 flex flex-col items-center border border-dashed border-slate-800 rounded-2xl">
                  <i className="fa-solid fa-magnifying-glass mb-3 opacity-20 text-3xl" />
                  <p className="text-[10px] uppercase font-bold">No system cache found</p>
                  {!btSupported && <p className="text-[9px] text-red-500/70 mt-2 px-6 italic">Web Bluetooth is disabled in this browser. Use Bluefy for iOS tracking.</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {systemDevices.map((device) => {
                    const isInRegistry = state.members.some(m => m.id === device.id);
                    return (
                      <div key={device.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-200 truncate">{device.name || 'Unknown Node'}</h4>
                          <p className="text-[9px] font-mono text-slate-600 truncate mt-0.5">ID: {device.id.slice(-8)}</p>
                        </div>
                        <button disabled={isInRegistry} onClick={() => { addDeviceToRegistry(device); setShowPairedModal(false); }} className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${isInRegistry ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-600 text-white'}`}>
                          {isInRegistry ? 'Linked' : 'Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="p-4 bg-slate-950 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center text-[9px] text-slate-600 uppercase font-black tracking-[0.2em] gap-2">
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Mesh Secured</span>
          <span className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${btSupported ? 'bg-blue-500' : 'bg-amber-500'}`} />BT {btSupported ? 'Linked' : 'Restricted'}</span>
        </div>
        <span>NOMAD-3.1.2-STABLE</span>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
