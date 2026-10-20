import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Activity, Zap, Scale, Gauge } from 'lucide-react';

export default function StatCard({ latestReading, settings }) {
  const adc = latestReading?.adc_value ?? 0;
  const voltage = latestReading?.voltage ?? 0.0;
  const ppm = latestReading?.ppm_estimate ?? 0.0;
  const rsRo = latestReading?.rs_ro_ratio ?? 0.0;
  const rsKohm = latestReading?.rs ?? 0.0;
  const status = latestReading?.gas_status || 'AMAN';
  const gasType = latestReading?.gas_type || settings?.gas_type || 'LPG';

  const warningPpm = settings?.warning_ppm || 200;
  const dangerPpm = settings?.danger_ppm || 500;

  // Status visual styles
  const getStatusConfig = () => {
    switch (status) {
      case 'BAHAYA':
        return {
          label: 'BAHAYA',
          subLabel: 'Konsentrasi gas melebihi batas aman!',
          bg: 'bg-rose-950/40 border-rose-600/60 text-rose-400',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: <AlertOctagon className="w-8 h-8 text-rose-400 animate-bounce" />,
          progressColor: 'bg-rose-500',
          pulse: 'ring-4 ring-rose-500/30'
        };
      case 'WASPADA':
        return {
          label: 'WASPADA',
          subLabel: 'Gas terdeteksi di atas ambang normal.',
          bg: 'bg-amber-950/40 border-amber-600/60 text-amber-400',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />,
          progressColor: 'bg-amber-500',
          pulse: ''
        };
      default:
        return {
          label: 'AMAN',
          subLabel: 'Kondisi udara normal dan bersih.',
          bg: 'bg-emerald-950/40 border-emerald-600/50 text-emerald-400',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
          progressColor: 'bg-emerald-500',
          pulse: ''
        };
    }
  };

  const statusConfig = getStatusConfig();
  const adcPercentage = Math.min(100, Math.max(0, (adc / 4095) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Status Utama (AMAN / WASPADA / BAHAYA) */}
      <div className={`glass-card rounded-2xl p-5 border relative overflow-hidden ${statusConfig.bg} ${statusConfig.pulse}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              Kondisi Keamanan Gas
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed">
              {statusConfig.subLabel}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner">
            {statusConfig.icon}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between text-xs text-slate-400">
          <span>Target Ambang:</span>
          <span className="font-mono text-slate-300">
            W:&gt;{warningPpm} | B:&gt;{dangerPpm} PPM
          </span>
        </div>
      </div>

      {/* 2. Estimasi Konsentrasi Gas (PPM) */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                Konsentrasi Gas Terkalibrasi
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {ppm.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
              </span>
              <span className="text-sm font-semibold text-cyan-400">PPM</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Kurva Kalibrasi Gas: <span className="font-semibold text-cyan-300">{gasType}</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
            <Gauge className="w-7 h-7" />
          </div>
        </div>

        {/* PPM relative to Danger threshold visual bar */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Rasio terhadap Bahaya</span>
            <span className="font-mono">{Math.round((ppm / dangerPpm) * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${statusConfig.progressColor}`}
              style={{ width: `${Math.min(100, (ppm / dangerPpm) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. Nilai Mentah ADC ESP32 (0–4095) */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 relative">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              ADC Mentah ESP32 (12-bit)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {adc}
              </span>
              <span className="text-xs text-slate-400">/ 4095</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tegangan V_out: <span className="font-mono text-emerald-400 font-semibold">{voltage.toFixed(2)} V</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-400">
            <Activity className="w-7 h-7" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Skala ADC</span>
            <span className="font-mono">{adcPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${adcPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 4. Karakteristik Sensor MQ-2 (Rs & Rs/R0) */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 relative">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              Rasio Karakteristik Fisik
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {rsRo.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-purple-400">Rs / R₀</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Resistansi Rs: <span className="font-mono text-purple-300 font-medium">{rsKohm ? rsKohm.toFixed(1) : '-'} kΩ</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-400">
            <Scale className="w-7 h-7" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>R₀ Terkalibrasi:</span>
          <span className="font-mono text-slate-300">{settings?.ro_clean_air || 10} kΩ</span>
        </div>
      </div>

    </div>
  );
}
