import React, { useState, useEffect } from 'react';
import { Play, Square, Terminal, Folder, Globe, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ServerCard({ server, onRefresh }) {
    const isRunning = server.state === 'running';
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!isRunning) return;
        const fetchStats = async () => {
            try {
                const { data } = await axios.get(`/api/servers/${server.name}/stats`);
                setStats(data);
            } catch (e) { console.error(e); }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [server.name, isRunning]);

    const handleAction = async (action) => {
        try {
            if (action === 'start') await axios.post(`/api/servers/${server.name}/start`);
            else await axios.post(`/api/servers/${server.name}/stop`);
            onRefresh();
        } catch (e) { console.error(e); }
    };

    const getIcon = () => {
        switch (server.type) {
            case 'ftp': return <Folder className="w-6 h-6 text-orange-400" />;
            case 'web': return <Globe className="w-6 h-6 text-blue-400" />;
            default: return <Terminal className="w-6 h-6 text-emerald-400" />;
        }
    };

    const StatBar = ({ label, value, color }) => (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-300 font-medium">{value?.toFixed(1) || 0}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(value || 0, 100)}%` }} />
            </div>
        </div>
    );

    return (
        <div className="bg-slate-900/50 border border-indigo-500/10 rounded-xl p-6 hover:border-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/5 group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${isRunning ? 'bg-emerald-500' : 'bg-red-500'} transition-colors`} />

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{server.name}</h3>
                        <span className={`text-xs font-medium uppercase tracking-wider ${isRunning ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isRunning ? 'Activo' : 'Detenido'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Metrics Section */}
            {isRunning && stats && (
                <div className="space-y-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
                    <StatBar label="CPU" value={stats.cpu} color="bg-indigo-500" />
                    <StatBar label="Memoria" value={stats.memory} color="bg-cyan-500" />
                    <StatBar label="Disco" value={stats.disk} color="bg-amber-500" />
                </div>
            )}
            {isRunning && !stats && (
                <div className="text-xs text-slate-500 mb-4 p-3 bg-slate-800/50 rounded-lg animate-pulse">
                    Cargando métricas...
                </div>
            )}

            <div className="flex space-x-3">
                {isRunning ? (
                    <>
                        <Link to={`/server/${server.name}`} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-colors">
                            <span>Gestionar</span>
                        </Link>
                        <button onClick={() => handleAction('stop')} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors" title="Detener">
                            <Square className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <button onClick={() => handleAction('start')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-colors">
                        <Play className="w-4 h-4" />
                        <span>Iniciar Servidor</span>
                    </button>
                )}
            </div>
        </div>
    );
}
