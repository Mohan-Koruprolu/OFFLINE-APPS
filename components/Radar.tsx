
import React, { useMemo } from 'react';
import { Member } from '../types';

interface RadarProps {
  members: Member[];
  maxDistance: number;
  highlightedMemberId: string | null;
}

export const Radar: React.FC<RadarProps> = ({ members, maxDistance, highlightedMemberId }) => {
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative w-full aspect-square bg-slate-900 rounded-full border border-slate-700 overflow-hidden flex items-center justify-center shadow-2xl">
      {/* Calibration Sweep */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500/20 via-transparent to-transparent animate-[spin_4s_linear_infinite]" />
      </div>

      {/* Grid Rings */}
      {rings.map((r, i) => (
        <div 
          key={i}
          className="absolute rounded-full border border-slate-800"
          style={{ width: `${r * 100}%`, height: `${r * 100}%` }}
        />
      ))}
      
      {/* Grid Lines */}
      <div className="absolute w-full h-[1px] bg-slate-800" />
      <div className="absolute h-full w-[1px] bg-slate-800" />

      {/* Center Point */}
      <div className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] z-30" />
      <div className="absolute w-8 h-8 bg-blue-500/20 rounded-full pulse-animation z-20" />

      {/* Vector Line for Highlighted Member */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100">
        {members.map((member, index) => {
          if (member.id !== highlightedMemberId) return null;
          
          const angle = (index * (360 / Math.max(members.length, 1))) * (Math.PI / 180);
          const radius = Math.min((member.distance / maxDistance) * 50, 48);
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <g key={`line-${member.id}`}>
              <line 
                x1="50" y1="50" x2={x} y2={y} 
                stroke="#eab308" strokeWidth="0.5" strokeDasharray="1 1"
                className="animate-pulse"
              />
              <circle cx={x} cy={y} r="6" fill="none" stroke="#eab308" strokeWidth="0.5" className="animate-ping" />
            </g>
          );
        })}
      </svg>

      {/* Members */}
      {members.map((member, index) => {
        const angle = (index * (360 / Math.max(members.length, 1))) * (Math.PI / 180);
        const radius = Math.min((member.distance / maxDistance) * 50, 48);
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        const isHighlighted = member.id === highlightedMemberId;

        return (
          <div 
            key={member.id}
            className={`absolute transition-all duration-1000 ease-in-out group z-20 ${isHighlighted ? 'scale-125' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className={`
              relative w-10 h-10 rounded-full border-2 p-0.5
              ${isHighlighted ? 'border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.6)]' : 
                member.status === 'lost' ? 'border-red-500 animate-bounce' : 
                member.status === 'warning' ? 'border-yellow-500' : 'border-emerald-500'}
            `}>
              <img src={member.avatar} className={`w-full h-full rounded-full object-cover ${isHighlighted ? 'brightness-110' : ''}`} alt={member.name} />
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 font-bold border border-slate-700">
                {member.name}: {member.distance}m
              </div>
            </div>
            
            {(member.status === 'lost' || isHighlighted) && (
              <div className={`absolute -inset-2 rounded-full animate-ping pointer-events-none ${isHighlighted ? 'bg-yellow-500/20' : 'bg-red-500/20'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
