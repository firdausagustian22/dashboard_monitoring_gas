import React from 'react';
import { Download, Filter, ChevronLeft, ChevronRight, HardDrive, Cpu, FlaskConical, Calendar } from 'lucide-react';
import { sensorApi } from '../services/api';

export default function HistoryTable({
  historyData = [],
  pagination = { page: 1, limit: 15, totalPages: 1, totalRecords: 0 },
  filters,
  onFilterChange,
  onPageChange,
  isLoading
}) {
  const handleExportCSV = () => {
    const url = sensorApi.getExportCSVUrl({
      startDate: filters.startDate,
      endDate: filters.endDate,
      isDemo: filters.isDemo
    });
    window.open(url, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BAHAYA':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            BAHAYA
          </span>
        );
      case 'WASPADA':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            WASPADA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            AMAN
          </span>
        );
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800">
      
      {/* Table Header & Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Riwayat Pengukuran Sensor</h3>
            <p className="text-xs text-slate-400">
              Total {pagination.totalRecords} log tersimpan dalam basis data MySQL
            </p>
          </div>
        </div>

        {/* Export CSV Button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 mb-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filter:</span>
        </div>

        {/* Start Date */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Mulai:</span>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
            className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Sampai:</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
            className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
          />
        </div>

        {/* Data Source Filter (Real vs Demo) */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
          <span className="text-slate-400">Sumber:</span>
          <select
            value={filters.isDemo}
            onChange={(e) => onFilterChange({ ...filters, isDemo: e.target.value })}
            className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
          >
            <option value="all" className="bg-slate-900">Semua Data</option>
            <option value="0" className="bg-slate-900">Hanya Sensor Fisik (Aktual)</option>
            <option value="1" className="bg-slate-900">Hanya Data Demo (Simulasi)</option>
          </select>
        </div>

        {/* Reset Filters */}
        {(filters.startDate || filters.endDate || filters.isDemo !== 'all') && (
          <button
            onClick={() => onFilterChange({ startDate: '', endDate: '', isDemo: 'all' })}
            className="text-cyan-400 hover:text-cyan-300 underline font-medium ml-auto"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-3.5">Waktu</th>
              <th className="py-3 px-3">Device ID</th>
              <th className="py-3 px-3">ADC (0-4095)</th>
              <th className="py-3 px-3">Tegangan (V)</th>
              <th className="py-3 px-3">Rs / R₀</th>
              <th className="py-3 px-3">Estimasi PPM</th>
              <th className="py-3 px-3">Status Gas</th>
              <th className="py-3 px-3">Tipe Sumber</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500 font-sans">
                  Memuat data riwayat...
                </td>
              </tr>
            ) : historyData.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500 font-sans">
                  Tidak ada data riwayat yang cocok dengan filter yang dipilih.
                </td>
              </tr>
            ) : (
              historyData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 whitespace-nowrap">
                    {formatTimestamp(row.created_at)}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-300 font-medium">
                    {row.device_id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {row.adc_value}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {row.voltage ? Number(row.voltage).toFixed(2) : '-'}V
                  </td>
                  <td className="py-2.5 px-3 text-purple-300">
                    {row.rs_ro_ratio ? Number(row.rs_ro_ratio).toFixed(2) : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {Number(row.ppm_estimate).toFixed(1)} PPM
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    {getStatusBadge(row.gas_status)}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    {row.is_demo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <FlaskConical className="w-3 h-3" /> DEMO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        <Cpu className="w-3 h-3" /> AKTUAL
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-xs text-slate-400">
        <div>
          Halaman <strong className="text-white">{pagination.page}</strong> dari{' '}
          <strong className="text-white">{pagination.totalPages || 1}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors border border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-slate-300">
            {pagination.page}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors border border-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
