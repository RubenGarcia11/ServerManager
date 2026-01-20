import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, HardDrive, MemoryStick, RefreshCw } from 'lucide-react';

export default function StatsView({ serverName }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/servers/${serverName}/stats`);
            setStats(data);
            setError(null);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 3000);
        return () => clearInterval(interval);
    }, [serverName]);

    const StatCard = ({ icon: Icon, label, value, color, bgColor }) => (
        <div className={`${bgColor} rounded-xl p-6 border border-slate-700`}>
            <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${color}`} />
                <span className="text-3xl font-bold text-white">{value?.toFixed(1) || 0}%</span>
            </div>
            <div className="text-slate-400 font-medium">{label}</div>
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-500`} style={{ width: `${Math.min(value || 0, 100)}%` }} />
            </div>
        </div>
    );

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-red-400">
                <p className="mb-4">Error al cargar estadísticas: {error}</p>
                <button onClick={fetchStats} className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Estadísticas del Servidor</h2>
                <button onClick={fetchStats} className="p-2 bg-slate-800 rounded hover:bg-slate-700">
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={Cpu} label="CPU" value={stats?.cpu} color="text-indigo-400" bgColor="bg-slate-800/50" />
                <StatCard icon={MemoryStick} label="Memoria RAM" value={stats?.memory} color="text-cyan-400" bgColor="bg-slate-800/50" />
                <StatCard icon={HardDrive} label="Disco" value={stats?.disk} color="text-amber-400" bgColor="bg-slate-800/50" />
            </div>

            {stats && (
                <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Información</h3>
                    <p className="text-slate-300 text-sm">
                        Servidor: <span className="text-white font-medium">{serverName}</span>
                    </p>
                    <p className="text-slate-300 text-sm">
                        Última actualización: <span className="text-white font-medium">{new Date().toLocaleTimeString()}</span>
                    </p>
                </div>
            )}
        </div>
    );
}
