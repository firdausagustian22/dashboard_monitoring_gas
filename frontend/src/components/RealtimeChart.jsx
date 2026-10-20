import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Layers } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function RealtimeChart({ chartDataList = [], settings }) {
  const [viewMode, setViewMode] = useState('ppm'); // 'ppm' | 'adc' | 'both'

  const warningPpm = settings?.warning_ppm || 200;
  const dangerPpm = settings?.danger_ppm || 500;

  // Siapkan data label waktu (misal: "22:45:10")
  const labels = chartDataList.map((item) => {
    const d = new Date(item.created_at || Date.now());
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  const ppmValues = chartDataList.map((item) => item.ppm_estimate ?? 0);
  const adcValues = chartDataList.map((item) => item.adc_value ?? 0);

  // Dataset konfigurasi
  const datasets = [];

  if (viewMode === 'ppm' || viewMode === 'both') {
    datasets.push({
      label: 'Konsentrasi Gas (PPM)',
      data: ppmValues,
      borderColor: '#06B6D4', // Cyan
      backgroundColor: 'rgba(6, 182, 212, 0.12)',
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#06B6D4',
      yAxisID: 'yPPM',
    });
  }

  if (viewMode === 'adc' || viewMode === 'both') {
    datasets.push({
      label: 'ADC Mentah ESP32 (0-4095)',
      data: adcValues,
      borderColor: '#818CF8', // Indigo
      backgroundColor: 'rgba(129, 140, 248, 0.12)',
      borderWidth: 2,
      tension: 0.35,
      fill: viewMode === 'adc',
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#818CF8',
      yAxisID: viewMode === 'both' ? 'yADC' : 'yPPM',
    });
  }

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94A3B8',
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#F8FAFC',
        bodyColor: '#CBD5E1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748B', font: { size: 10 } }
      },
      yPPM: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.07)' },
        ticks: {
          color: '#06B6D4',
          font: { size: 11 }
        },
        title: {
          display: true,
          text: viewMode === 'adc' ? 'Nilai ADC (0 - 4095)' : 'PPM Gas',
          color: viewMode === 'adc' ? '#818CF8' : '#06B6D4',
          font: { size: 11, weight: '600' }
        }
      },
      ...(viewMode === 'both' ? {
        yADC: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#818CF8', font: { size: 11 } },
          min: 0,
          max: 4095,
          title: {
            display: true,
            text: 'ADC (0-4095)',
            color: '#818CF8',
            font: { size: 11, weight: '600' }
          }
        }
      } : {})
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 mb-6">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Grafik Tren Real-Time</h3>
            <p className="text-xs text-slate-400">Pembaruan otomatis tiap penerimaan paket data dari ESP32</p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('ppm')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'ppm'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PPM Gas
          </button>
          <button
            onClick={() => setViewMode('adc')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'adc'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ADC Mentah
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'both'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kedua Grafik
          </button>
        </div>
      </div>

      {/* Threshold Reference Indicator Line */}
      {viewMode !== 'adc' && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-3 px-2 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
          <span className="font-medium text-slate-300">Garis Panduan Ambang:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400"></span>
            <span>Waspada: <strong>{warningPpm} PPM</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500"></span>
            <span>Bahaya: <strong>{dangerPpm} PPM</strong></span>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="h-72 w-full">
        {chartDataList.length > 0 ? (
          <Line data={{ labels, datasets }} options={options} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Layers className="w-8 h-8 opacity-40 animate-pulse" />
            <p className="text-xs">Menunggu aliran data pertama dari ESP32 atau simulator demo...</p>
          </div>
        )}
      </div>
    </div>
  );
}
