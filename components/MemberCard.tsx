
import React from 'react';
import { Member } from '../types';

interface MemberCardProps {
  member: Member;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  onToggleIgnore: (id: string) => void;
  onRemove: (id: string) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, isHighlighted, onSelect, onToggleIgnore, onRemove }) => {
  const getStatusColor = () => {
    if (member.isIgnored) return 'text-slate-500 bg-slate-500/10';
    switch (member.status) {
      case 'connected': return 'text-emerald-400 bg-emerald-400/10';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10';
      case 'lost': return 'text-red-400 bg-red-400/10 animate-pulse';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level <= 20) return 'text-red-500';
    if (level <= 50) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  const getBatteryIcon = (level: number) => {
    if (level <= 10) return 'fa-battery-empty';
    if (level <= 30) return 'fa-battery-quarter';
    if (level <= 60) return 'fa-battery-half';
    if (level <= 85) return 'fa-battery-three-quarters';
    return 'fa-battery-full';
  };

  return (
    <div 
      onClick={() => onSelect(member.id)}
      className={`p-4 rounded-xl border transition-all cursor-pointer group ${
      isHighlighted ? 'ring-2 ring-yellow-500 bg-slate-800 border-yellow-500/50' :
      member.isIgnored ? 'opacity-60 bg-slate-900/50 border-slate-800 hover:bg-slate-900' :
      member.status === 'lost' || member.battery <= 20 ? 'bg-red-950/20 border-red-900/50 shadow-lg shadow-red-900/10' : 'bg-slate-900 border-slate-800 hover:border-slate-600'
    }`}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <img src={member.avatar} className={`w-12 h-12 rounded-full border-2 ${member.isIgnored ? 'border-slate-700 grayscale' : isHighlighted ? 'border-yellow-400' : 'border-slate-600'}`} alt={member.name} />
          {!member.isIgnored && (
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
              member.status === 'connected' ? 'bg-emerald-500' : 
              member.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`font-bold transition-colors ${isHighlighted ? 'text-yellow-400' : member.isIgnored ? 'text-slate-500' : 'text-slate-100'}`}>
                {member.name}
                {isHighlighted && <i className="fa-solid fa-crosshairs ml-2 text-[10px] animate-pulse" />}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 font-mono">ID: {member.id.slice(0,8)}</p>
                {!member.isIgnored && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold ${getBatteryColor(member.battery)}`}>
                    <i className={`fa-solid ${getBatteryIcon(member.battery)}`} />
                    <span>{member.battery}%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
               <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${getStatusColor()}`}>
                {member.isIgnored ? 'Ignored' : member.status}
              </span>
              <div className="flex gap-3 mt-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleIgnore(member.id); }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 underline font-bold"
                >
                  {member.isIgnored ? 'Track' : 'Ignore'}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(member.id); }}
                  className="text-[10px] text-red-500 hover:text-red-400 underline font-bold"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
          
          {!member.isIgnored && (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-slate-400 text-sm">
                <i className="fa-solid fa-ruler-horizontal text-[10px]" />
                <span className={isHighlighted ? 'text-yellow-400 font-bold' : ''}>{member.distance}m</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-sm">
                <i className="fa-solid fa-wifi text-[10px]" />
                <span>{member.rssi} dBm</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {!member.isIgnored && (
        <>
          {member.status === 'lost' && (
            <div className="mt-3 py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
              <i className="fa-solid fa-triangle-exclamation" />
              <span>Out of range! Check proximity.</span>
            </div>
          )}
          {isHighlighted && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                // In a real app, this would write to a BLE characteristic
                alert(`Tactical Ping sent to ${member.name}'s device.`);
              }}
              className="mt-3 w-full py-2 bg-yellow-500 text-black font-black text-[10px] uppercase rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
            >
              <i className="fa-solid fa-bullhorn mr-2" />
              Trigger Device Alert
            </button>
          )}
        </>
      )}
    </div>
  );
};
