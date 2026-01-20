import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, RefreshCw, Globe, FileCode, Upload, Check, Loader } from 'lucide-react';

export default function WebControl({ serverName }) {
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(true);

    // FTP HTML files state
    const [htmlFiles, setHtmlFiles] = useState([]);
    const [deploying, setDeploying] = useState(null);
    const [deploySuccess, setDeploySuccess] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Use container name directly (backend is in Docker network)
            const sRes = await axios.post('/api/web/status', { host: serverName });
            setStatus(sRes.data);

            const lRes = await axios.post('/api/web/logs', { host: serverName });
            setLogs(lRes.data.logs);

            // Fetch HTML files from FTP server
            const fRes = await axios.post('/api/web/ftp-files', { ftpHost: 'ftp-target' });
            setHtmlFiles(fRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeploy = async (file) => {
        setDeploying(file.name);
        setDeploySuccess(null);
        try {
            await axios.post('/api/web/deploy', {
                ftpHost: 'ftp-target',
                webHost: serverName,
                filePath: `/archivos/${file.name}`,
                fileName: file.name
            });
            setDeploySuccess(file.name);
            setTimeout(() => setDeploySuccess(null), 3000);
        } catch (e) {
            alert('Error al desplegar: ' + (e.response?.data?.error || e.message));
        } finally {
            setDeploying(null);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [serverName]);

    return (
        <div className="p-6 h-full flex flex-col space-y-6 text-white overflow-auto">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
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

            {/* HTML Files from FTP */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center space-x-2 mb-4">
                    <FileCode className="w-5 h-5 text-orange-400" />
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Archivos HTML del FTP</h3>
                </div>
                {htmlFiles.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay archivos HTML en el servidor FTP. Sube archivos .html al servidor FTP para poder desplegarlos aquí.</p>
                ) : (
                    <div className="space-y-2">
                        {htmlFiles.map(file => (
                            <div key={file.name} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                                <div className="flex items-center space-x-3">
                                    <FileCode className="w-4 h-4 text-orange-400" />
                                    <span className="font-medium">{file.name}</span>
                                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                                <button
                                    onClick={() => handleDeploy(file)}
                                    disabled={deploying === file.name}
                                    className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm font-medium transition-all ${deploySuccess === file.name
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        } disabled:opacity-50`}
                                >
                                    {deploying === file.name ? (
                                        <><Loader className="w-4 h-4 animate-spin" /> <span>Desplegando...</span></>
                                    ) : deploySuccess === file.name ? (
                                        <><Check className="w-4 h-4" /> <span>¡Desplegado!</span></>
                                    ) : (
                                        <><Upload className="w-4 h-4" /> <span>Desplegar</span></>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Logs de Acceso</h3>
                <div className="bg-slate-950 rounded border border-slate-800 p-4 font-mono text-xs overflow-auto flex-1 text-slate-300 whitespace-pre">
                    {logs || 'Sin logs disponibles o cargando...'}
                </div>
            </div>
        </div>
    );
}
