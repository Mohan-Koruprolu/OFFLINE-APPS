
import React, { useMemo } from 'react';
import { Breadcrumb, POI, UserLocation } from '../types';

interface TrailNavigatorProps {
  breadcrumbs: Breadcrumb[];
  pois: POI[];
  currentLocation: UserLocation | null;
  onDropPin: (type: POI['type']) => void;
}

export const TrailNavigator: React.FC<TrailNavigatorProps> = ({ breadcrumbs, pois, currentLocation, onDropPin }) => {
  // Enhanced projection: Include current location in bounds to ensure user is always mapped
  const bounds = useMemo(() => {
    const allLats = breadcrumbs.map(b => b.lat);
    const allLngs = breadcrumbs.map(b => b.lng);
    
    if (currentLocation) {
      allLats.push(currentLocation.latitude);
      allLngs.push(currentLocation.longitude);
    }
    
    if (allLats.length === 0) return null;

    let minLat = Math.min(...allLats);
    let maxLat = Math.max(...allLats);
    let minLng = Math.min(...allLngs);
    let maxLng = Math.max(...allLngs);

    // Ensure a minimum viewing area (roughly 50m) if only one point exists
    const minSpan = 0.0005; 
    if (maxLat - minLat < minSpan) {
      const center = (maxLat + minLat) / 2;
      minLat = center - minSpan / 2;
      maxLat = center + minSpan / 2;
    }
    if (maxLng - minLng < minSpan) {
      const center = (maxLng + minLng) / 2;
      minLng = center - minSpan / 2;
      maxLng = center + minSpan / 2;
    }

    // Add 15% padding
    const latPadding = (maxLat - minLat) * 0.15;
    const lngPadding = (maxLng - minLng) * 0.15;

    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding
    };
  }, [breadcrumbs, currentLocation]);

  const renderMapContent = () => {
    if (!bounds) return null;
    const b = bounds;

    const getX = (lng: number) => ((lng - b.minLng) / (b.maxLng - b.minLng || 1)) * 100;
    const getY = (lat: number) => 100 - ((lat - b.minLat) / (b.maxLat - b.minLat || 1)) * 100;

    const points = breadcrumbs.map(p => `${getX(p.lng)},${getY(p.lat)}`).join(' ');

    return (
      <svg viewBox="-5 -5 110 110" className="w-full h-full">
        {/* Trail Path */}
        {breadcrumbs.length >= 2 && (
          <polyline
            points={points}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeDasharray="1 2"
            className="drop-shadow-[0_0_3px_rgba(6,182,212,0.6)]"
          />
        )}

        {/* POIs */}
        {pois.map(poi => {
          const px = getX(poi.lng);
          const py = getY(poi.lat);
          return (
            <g key={poi.id}>
               <circle cx={px} cy={py} r="1.5" fill={poi.type === 'danger' ? '#ef4444' : '#eab308'} className="drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
               <text x={px} y={py - 3} fontSize="3" fill="white" textAnchor="middle" className="font-bold pointer-events-none select-none filter drop-shadow-[0_1px_1px_rgba(0,0,0,1)] uppercase tracking-tighter">
                 {poi.label}
               </text>
            </g>
          );
        })}

        {/* DISTINCT CURRENT POSITION MARKER */}
        {currentLocation && (
          <g className="current-pos-marker">
            {/* Pulsing Halo */}
            <circle cx={getX(currentLocation.longitude)} cy={getY(currentLocation.latitude)} r="4" fill="#3b82f6" opacity="0.3">
              <animate attributeName="r" from="2" to="8" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
            </circle>
            
            {/* Tactical Crosshair Background */}
            <circle cx={getX(currentLocation.longitude)} cy={getY(currentLocation.latitude)} r="3" fill="none" stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="1 1" />
            
            {/* Vertical/Horizontal Reticle Lines */}
            <line 
              x1={getX(currentLocation.longitude) - 4} y1={getY(currentLocation.latitude)} 
              x2={getX(currentLocation.longitude) + 4} y2={getY(currentLocation.latitude)} 
              stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.8" 
            />
            <line 
              x1={getX(currentLocation.longitude)} y1={getY(currentLocation.latitude) - 4} 
              x2={getX(currentLocation.longitude)} y2={getY(currentLocation.latitude) + 4} 
              stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.8" 
            />
            
            {/* High-Visibility Center Point */}
            <circle cx={getX(currentLocation.longitude)} cy={getY(currentLocation.latitude)} r="1.8" fill="#3b82f6" stroke="#fff" strokeWidth="0.6" className="drop-shadow-lg" />
            
            {/* Small ID Label for the User */}
            <text 
              x={getX(currentLocation.longitude)} 
              y={getY(currentLocation.latitude) + 7} 
              fontSize="2.5" 
              fill="#60a5fa" 
              textAnchor="middle" 
              className="font-black select-none uppercase tracking-widest"
            >
              YOU
            </text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-inner p-4">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
        
        {bounds ? (
          renderMapContent()
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center px-8">
            <i className="fa-solid fa-map-location-dot text-4xl mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">Awaiting Location</p>
            <p className="text-xs mt-2">Establish GPS link or start recording to initialize tactical map.</p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
           <button onClick={() => onDropPin('camp')} title="Mark Camp" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:scale-90 transition-all rounded-full flex items-center justify-center border border-slate-700 shadow-xl">
             <i className="fa-solid fa-tent text-yellow-500 text-sm" />
           </button>
           <button onClick={() => onDropPin('water')} title="Mark Water" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:scale-90 transition-all rounded-full flex items-center justify-center border border-slate-700 shadow-xl">
             <i className="fa-solid fa-droplet text-blue-400 text-sm" />
           </button>
           <button onClick={() => onDropPin('danger')} title="Mark Danger" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:scale-90 transition-all rounded-full flex items-center justify-center border border-slate-700 shadow-xl">
             <i className="fa-solid fa-triangle-exclamation text-red-500 text-sm" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Waypoints</p>
          <p className="text-xl font-mono font-bold text-white">{breadcrumbs.length}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Elevation</p>
          <p className="text-xl font-mono font-bold text-white">{currentLocation?.altitude?.toFixed(0) || '--'}m</p>
        </div>
      </div>
    </div>
  );
};
