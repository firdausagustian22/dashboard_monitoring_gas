import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import DeviceStatusBadge from './components/DeviceStatusBadge';
import StatCard from './components/StatCard';
import RealtimeChart from './components/RealtimeChart';
import HistoryTable from './components/HistoryTable';
import ThresholdModal from './components/ThresholdModal';
import DemoControl from './components/DemoControl';
import { sensorApi, settingsApi } from './services/api';
import socket from './services/socket';

export default function App() {
  // State manajemen koneksi & data
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [latestReading, setLatestReading] = useState(null);
  const [devices, setDevices] = useState([]);
  const [settings, setSettings] = useState({
    warning_ppm: 200,
    danger_ppm: 500,
    ro_clean_air: 10,
    rl_kohm: 10,
    gas_type: 'LPG'
  });

  // State grafik real-time
  const [chartDataList, setChartDataList] = useState([]);

  // State riwayat data & filter
  const [historyData, setHistoryData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalRecords: 0 });
  const [filters, setFilters] = useState({ startDate: '', endDate: '', isDemo: 'all' });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modals & audio alert
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(true); // Default muted to prevent sudden noise
  const audioContextRef = useRef(null);

  // Fungsi membunyikan peringatan audio web synthesizer saat kondisi BAHAYA
  const playDangerBeep = () => {
    if (alarmMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  };

  // 1. Inisialisasi awal mengambil data dari backend REST API
  const fetchData = async () => {
    try {
      // Ambil data terbaru & info perangkat
      const latestRes = await sensorApi.getLatest();
      if (latestRes.success) {
        if (latestRes.latest) {
          setLatestReading(latestRes.latest);
          setChartDataList([latestRes.latest]);
        }
        if (latestRes.devices) setDevices(latestRes.devices);
        if (latestRes.settings) setSettings(latestRes.settings);
      }

      // Ambil pengaturan
      const settingsRes = await settingsApi.getSettings();
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }

      // Ambil riwayat awal
      fetchHistory(1);
    } catch (err) {
      console.error('Error inisialisasi data:', err);
    }
  };

  // 2. Mengambil riwayat data dengan pagination & filter
  const fetchHistory = async (page = 1) => {
    setIsLoadingHistory(true);
    try {
      const res = await sensorApi.getHistory({
        page,
        limit: pagination.limit,
        startDate: filters.startDate,
        endDate: filters.endDate,
        isDemo: filters.isDemo
      });

      if (res.success) {
        setHistoryData(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error mengambil riwayat:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Fallback Polling interval (setiap 2.5 detik) agar sinkron otomatis di cloud Vercel
    const pollInterval = setInterval(async () => {
      try {
        const res = await sensorApi.getLatest();
        if (res.success && res.latest) {
          setLatestReading((current) => {
            if (!current || current.id !== res.latest.id) {
              setChartDataList((prev) => {
                const next = [...prev, res.latest];
                return next.length > 30 ? next.slice(next.length - 30) : next;
              });
              if (res.latest.gas_status === 'BAHAYA') {
                playDangerBeep();
              }
              return res.latest;
            }
            return current;
          });
          if (res.devices) setDevices(res.devices);
        }
      } catch (e) {
        // silent fail on network glitch
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, []);

  // Tangani perubahan filter riwayat
  useEffect(() => {
    fetchHistory(1);
  }, [filters]);

  // 3. Konfigurasi Event Listener WebSocket Socket.IO
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onSensorReading(newReading) {
      setLatestReading(newReading);

      // Tambahkan ke buffer grafik real-time (maksimum 30 titik data terakhir)
      setChartDataList((prev) => {
        const next = [...prev, newReading];
        if (next.length > 30) {
          return next.slice(next.length - 30);
        }
        return next;
      });

      // Tambahkan ke tabel riwayat jika di halaman 1 dan cocok filter
      setHistoryData((prev) => [newReading, ...prev.slice(0, pagination.limit - 1)]);
      setPagination((prev) => ({ ...prev, totalRecords: prev.totalRecords + 1 }));

      // Bunyikan alarm jika bahaya
      if (newReading.gas_status === 'BAHAYA') {
        playDangerBeep();
      }
    }

    function onDeviceStatusChange(deviceInfo) {
      setDevices((prev) => {
        const index = prev.findIndex((d) => d.device_id === deviceInfo.deviceId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: deviceInfo.status,
            last_seen: deviceInfo.lastSeen
          };
          return updated;
        } else {
          return [
            {
              device_id: deviceInfo.deviceId,
              device_name: deviceInfo.deviceName,
              status: deviceInfo.status,
              last_seen: deviceInfo.lastSeen
            },
            ...prev
          ];
        }
      });
    }

    function onSettingsUpdated(updatedSettings) {
      setSettings(updatedSettings);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sensor_reading', onSensorReading);
    socket.on('device_status_change', onDeviceStatusChange);
    socket.on('settings_updated', onSettingsUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sensor_reading', onSensorReading);
      socket.off('device_status_change', onDeviceStatusChange);
      socket.off('settings_updated', onSettingsUpdated);
    };
  }, [pagination.limit, alarmMuted]);

  const hasActiveDanger = latestReading?.gas_status === 'BAHAYA';

  return (
    <div className="min-h-screen pb-12">
      {/* Top Navigation */}
      <Navbar
        isConnected={isConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleDemoModal={() => setIsDemoOpen(true)}
        onRefresh={fetchData}
        alarmMuted={alarmMuted}
        onToggleMute={() => setAlarmMuted(!alarmMuted)}
        hasActiveDanger={hasActiveDanger}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Connection & Heartbeat Status Banner */}
        <DeviceStatusBadge
          devices={devices}
          latestReading={latestReading}
        />

        {/* 4 Key Stat Cards (Status, PPM, ADC, Rs/R0) */}
        <StatCard
          latestReading={latestReading}
          settings={settings}
        />

        {/* Real-time Dynamic Chart */}
        <RealtimeChart
          chartDataList={chartDataList}
          settings={settings}
        />

        {/* History Table with Filters, Pagination, & CSV Export */}
        <HistoryTable
          historyData={historyData}
          pagination={pagination}
          filters={filters}
          onFilterChange={setFilters}
          onPageChange={(newPage) => fetchHistory(newPage)}
          isLoading={isLoadingHistory}
        />

      </main>

      {/* Threshold & Calibration Configuration Modal */}
      <ThresholdModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSettingsSaved={(newSettings) => setSettings(newSettings)}
        currentADC={latestReading?.adc_value}
      />

      {/* Demo Simulator Control Modal */}
      <DemoControl
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </div>
  );
}
