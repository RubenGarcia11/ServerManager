import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, RefreshCw, Globe } from 'lucide-react';

export default function WebControl({ serverName }) {
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Use container name directly (backend is in Docker network)
            const sRes = await axios.post('/api/web/status', { host: serverName });
            setStatus(sRes.data);

            const lRes = await axios.post('/api/web/logs', { host: serverName });
            setLogs(lRes.data.logs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [serverName]);

    return (
        <div className="p-6 h-full flex flex-col space-y-6 text-white">
            <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-lg font-bold flex items-center space-x-2 ${status?.status === 'running' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                    <Activity className="w-5 h-5" />
                    <span className="uppercase">{status?.status === 'running' ? 'Activo' : status?.status || 'Desconocido'}</span>
                </div>
                <button onClick={fetchData} className="p-2 bg-slate-800 rounded hover:bg-slate-700">
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center space-x-2 text-sm font-medium">
                    <Globe className="w-4 h-4" /> <span>Abrir Sitio</span>
                </a>
            </div>

            <div className="flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Logs de Acceso</h3>
                <div className="bg-slate-950 rounded border border-slate-800 p-4 font-mono text-xs overflow-auto flex-1 text-slate-300 whitespace-pre">
                    {logs || 'Sin logs disponibles o cargando...'}
                </div>
            </div>
        </div>
    );
}
