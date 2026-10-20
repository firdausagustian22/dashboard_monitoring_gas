import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, AlertCircle, Wrench } from 'lucide-react';
import { settingsApi } from '../services/api';

export default function ThresholdModal({ isOpen, onClose, currentSettings, onSettingsSaved, currentADC }) {
  const [formData, setFormData] = useState({
    warning_ppm: 200,
    danger_ppm: 500,
    ro_clean_air: 10,
    rl_kohm: 10,
    gas_type: 'LPG'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        warning_ppm: currentSettings.warning_ppm || 200,
        danger_ppm: currentSettings.danger_ppm || 500,
        ro_clean_air: currentSettings.ro_clean_air || 10,
        rl_kohm: currentSettings.rl_kohm || 10,
        gas_type: currentSettings.gas_type || 'LPG'
      });
    }
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await settingsApi.updateSettings(formData);
      setMessage({ type: 'success', text: res.message || 'Pengaturan berhasil disimpan!' });
      if (onSettingsSaved) onSettingsSaved(res.data);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Gagal menyimpan pengaturan'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoCalibrate = async () => {
    if (!currentADC || currentADC < 50) {
      alert('Nilai ADC saat ini tidak terbaca atau terlalu rendah untuk kalibrasi udara bersih.');
      return;
    }

    if (!window.confirm(`Pastikan sensor MQ-2 sedang berada di lingkungan UDARA BERSIH. Kalibrasi menggunakan ADC saat ini (${currentADC})?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await settingsApi.autoCalibrateR0({
        adc_clean_air: currentADC,
        rl_kohm: formData.rl_kohm
      });
      setMessage({ type: 'success', text: res.message });
      if (onSettingsSaved) onSettingsSaved(res.data);
      setFormData(prev => ({ ...prev, ro_clean_air: res.data.ro_clean_air }));
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Gagal kalibrasi otomatis'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Konfigurasi Ambang Batas & Kalibrasi</h3>
              <p className="text-xs text-slate-400">Parameter sensor gas MQ-2 dan peringatan bahaya</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
          }`}>
            {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Target Gas Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Jenis Gas Target (Kurva Datasheet MQ-2)
            </label>
            <select
              value={formData.gas_type}
              onChange={(e) => setFormData({ ...formData, gas_type: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="LPG">LPG (Liquefied Petroleum Gas / Propana-Butana)</option>
              <option value="SMOKE">Asap Kebakaran / Smoke</option>
              <option value="CH4">Gas Metana (CH₄ / Natural Gas)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Warning PPM */}
            <div>
              <label className="block text-xs font-medium text-amber-300 mb-1">
                Ambang Batas WASPADA (PPM)
              </label>
              <input
                type="number"
                step="1"
                min="10"
                max="5000"
                value={formData.warning_ppm}
                onChange={(e) => setFormData({ ...formData, warning_ppm: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
              <span className="text-[11px] text-slate-500">Nilai mulai waspada (default: 200 PPM)</span>
            </div>

            {/* Danger PPM */}
            <div>
              <label className="block text-xs font-medium text-rose-400 mb-1">
                Ambang Batas BAHAYA (PPM)
              </label>
              <input
                type="number"
                step="1"
                min="20"
                max="10000"
                value={formData.danger_ppm}
                onChange={(e) => setFormData({ ...formData, danger_ppm: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                required
              />
              <span className="text-[11px] text-slate-500">Memicu alarm & bahaya (default: 500 PPM)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ro Clean Air */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Resistansi Udara Bersih R₀ (kΩ)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="100"
                value={formData.ro_clean_air}
                onChange={(e) => setFormData({ ...formData, ro_clean_air: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                required
              />
              <span className="text-[11px] text-slate-500">Hasil kalibrasi sensor di udara segar</span>
            </div>

            {/* RL Kohm */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Resistor Beban R_L (kΩ)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="50"
                value={formData.rl_kohm}
                onChange={(e) => setFormData({ ...formData, rl_kohm: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                required
              />
              <span className="text-[11px] text-slate-500">Resistor pembagi beban modul (biasanya 10kΩ)</span>
            </div>
          </div>

          {/* Quick Auto-Calibration Assist */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-200">Bantuan Kalibrasi Udara Bersih (Clean Air):</p>
              <p className="text-slate-400 text-[11px]">
                ADC saat ini: <strong className="text-cyan-400 font-mono">{currentADC || '-'}</strong> (Rs / R₀ ≈ 9.83)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAutoCalibrate}
              disabled={isSubmitting || !currentADC}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold transition-all text-xs disabled:opacity-40"
            >
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kalibrasi R₀ Otomatis</span>
            </button>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
