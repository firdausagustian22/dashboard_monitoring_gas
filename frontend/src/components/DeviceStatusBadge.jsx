import React from 'react';
import { Cpu, Wifi, WifiOff, Clock } from 'lucide-react';

export default function DeviceStatusBadge({ devices = [], latestReading }) {
  // Ambil perangkat utama atau tampilkan placeholder jika belum ada
  const primaryDevice = devices.length > 0 ? devices[0] : null;
  
  // Perangkat dianggap ONLINE jika status 'ONLINE' dan data diterima dalam 35 detik terakhir
  const isRecentlyActive = primaryDevice?.last_seen 
    ? (Date.now() - new Date(primaryDevice.last_seen).getTime()) < 35000 
    : false;
  const isOnline = Boolean(primaryDevice && isRecentlyActive);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Belum pernah terhubung';
    try {
      const date = new Date(timestamp);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 5) return 'Baru saja';
      if (diffSec < 60) return `${diffSec} detik lalu`;
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Device Information */}
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-xl border ${
            isOnline 
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' 
              : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
          }`}>
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">
                {primaryDevice ? primaryDevice.device_name : 'ESP32 Device Node'}
              </h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isOnline 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    ONLINE
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    OFFLINE
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ID: <span className="font-mono text-slate-300">{primaryDevice ? primaryDevice.device_id : 'Belum Terdaftar'}</span>
              {primaryDevice?.ip_address && (
                <span className="ml-2 pl-2 border-l border-slate-700 text-slate-400">
                  IP: <span className="font-mono">{primaryDevice.ip_address}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Heartbeat & Data Source Type */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs">
          {/* Data Tag indicator */}
          {latestReading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium">
              {latestReading.is_demo ? (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Mode Simulasi Demo
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Sensor Fisik / Wokwi Aktual
                </span>
              )}
            </div>
          )}

          {/* Last Seen Tracker */}
          <div className="flex items-center gap-1.5 text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Terakhir Terdeteksi: <strong className="text-slate-300 font-mono">{formatLastSeen(primaryDevice?.last_seen)}</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
}
