import React, { useState, useEffect } from 'react';
import { X, Play, Square, Sparkles, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { sensorApi } from '../services/api';

export default function DemoControl({ isOpen, onClose }) {
  const [isAutoStreaming, setIsAutoStreaming] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const sendScenario = async (scenario) => {
    try {
      setStatusMsg(`Mengirim paket simulasi (${scenario})...`);
      const res = await sensorApi.triggerDemoData(scenario);
      setStatusMsg(`Berhasil dikirim: ADC ${res.data.adc_value} (${res.data.gas_status})`);
    } catch (err) {
      setStatusMsg(`Gagal: ${err.message}`);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isAutoStreaming) {
      interval = setInterval(() => {
        // Siklus random dengan kecenderungan aman dan sesekali spike
        const roll = Math.random();
        let scenario = 'safe';
        if (roll > 0.85) scenario = 'danger';
        else if (roll > 0.6) scenario = 'warning';

        sensorApi.triggerDemoData(scenario).catch(() => {});
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoStreaming]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-indigo-500/30 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Simulator Demo IoT</h3>
              <p className="text-xs text-slate-400">Pengujian sistem tanpa perangkat ESP32 fisik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 leading-relaxed">
          Semua data yang dihasilkan melalui simulator ini otomatis ditandai dengan flag <strong>is_demo = true</strong> untuk membedakannya secara jelas dari data sensor aktual.
        </div>

        {/* Scenario Manual Trigger Buttons */}
        <div className="mt-4 space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Pemicu Skenario Sekali Klik (Manual)
          </label>

          <button
            onClick={() => sendScenario('safe')}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 text-xs font-medium transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Simulasi Udara Bersih (AMAN)</span>
            </div>
            <span className="font-mono text-slate-400 text-[11px]">ADC ~300</span>
          </button>

          <button
            onClick={() => sendScenario('warning')}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 text-amber-300 text-xs font-medium transition-all"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Simulasi Asap / Gas Sedang (WASPADA)</span>
            </div>
            <span className="font-mono text-slate-400 text-[11px]">ADC ~1750</span>
          </button>

          <button
            onClick={() => sendScenario('danger')}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 text-xs font-medium transition-all"
          >
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Simulasi Kebocoran Gas Tinggi (BAHAYA)</span>
            </div>
            <span className="font-mono text-slate-400 text-[11px]">ADC ~2800</span>
          </button>
        </div>

        {/* Auto Streaming Simulator Toggle */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">Aliran Otomatis (Auto Stream)</p>
            <p className="text-[11px] text-slate-400">Kirim data acak setiap 3 detik</p>
          </div>
          <button
            onClick={() => setIsAutoStreaming(!isAutoStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isAutoStreaming
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isAutoStreaming ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Hentikan</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Mulai Auto</span>
              </>
            )}
          </button>
        </div>

        {/* Status Feedback */}
        {statusMsg && (
          <p className="mt-3 text-center text-xs text-slate-400 font-mono">
            {statusMsg}
          </p>
        )}

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
