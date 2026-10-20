import React, { useState, useEffect } from 'react';
import { Flame, Sliders, PlayCircle, RefreshCw, Radio, BellRing, BellOff } from 'lucide-react';

export default function Navbar({ 
  isConnected, 
  onOpenSettings, 
  onToggleDemoModal, 
  onRefresh, 
  alarmMuted, 
  onToggleMute,
  hasActiveDanger
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 sm:px-6 py-3.5 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Brand & System Title */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
              <Flame className="w-6 h-6 animate-pulse" />
              {hasActiveDanger && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">GasGuard IoT</h1>
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  ESP32 & MQ-2
                </span>
              </div>
              <p className="text-xs text-slate-400">Sistem Monitoring Gas Real-Time & Kalibrasi Fisik</p>
            </div>
          </div>

          {/* Mobile Clock & Status */}
          <div className="sm:hidden flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isConnected 
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' 
                : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping-slow' : 'bg-rose-500'}`}></span>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Action Controls & Realtime Status */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
          {/* Real-time Clock */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>WIB: {timeStr}</span>
          </div>

          {/* Socket Connection Badge */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border glass-panel">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
              {isConnected ? 'Server WebSocket Aktif' : 'Server Terputus'}
            </span>
          </div>

          {/* Alarm Audio Mute Button */}
          <button
            onClick={onToggleMute}
            title={alarmMuted ? 'Aktifkan Suara Alarm' : 'Senyapkan Suara Alarm'}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              alarmMuted 
                ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white' 
                : 'bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/40'
            }`}
          >
            {alarmMuted ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Simulator Demo Trigger */}
          <button
            onClick={onToggleDemoModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all shadow-sm"
          >
            <PlayCircle className="w-4 h-4 text-indigo-400" />
            <span>Simulasi Demo</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-medium transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Ambang Batas</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
