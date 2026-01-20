import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Terminal as TermIcon, FileText, Activity, BarChart3 } from 'lucide-react';
import Terminal from './Terminal';
import FileManager from './FileManager';
import WebControl from './WebControl';
import StatsView from './StatsView';

export default function ServerDetail() {
    const { name } = useParams();
    const [server, setServer] = useState(null);
    const [activeTab, setActiveTab] = useState('terminal');

    useEffect(() => {
        const type = name.includes('ftp') ? 'ftp' : name.includes('web') ? 'web' : 'ssh';
        setServer({ name, type });
        if (type === 'ftp') setActiveTab('files');
        if (type === 'web') setActiveTab('web');
        if (type === 'ssh') setActiveTab('terminal');
    }, [name]);

    if (!server) return <div className="p-8 text-white">Cargando...</div>;

    return (
        <div className="space-y-6">
            <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Panel
            </Link>

            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold">{server.name}</h1>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    {server.type === 'ssh' && (
                        <button onClick={() => setActiveTab('terminal')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'terminal' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <div className="flex items-center space-x-2">
                                <TermIcon className="w-4 h-4" /> <span>Terminal</span>
                            </div>
                        </button>
                    )}
                    {server.type === 'ftp' && (
                        <button onClick={() => setActiveTab('files')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'files' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4" /> <span>Archivos</span>
                            </div>
                        </button>
                    )}
                    {server.type === 'web' && (
                        <button onClick={() => setActiveTab('web')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'web' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <div className="flex items-center space-x-2">
                                <Activity className="w-4 h-4" /> <span>Estado Web</span>
                            </div>
                        </button>
                    )}
                    <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'stats' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4" /> <span>Estadísticas</span>
                        </div>
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden h-[600px] flex flex-col">
                {activeTab === 'terminal' && <Terminal serverName={name} />}
                {activeTab === 'files' && <FileManager serverName={name} />}
                {activeTab === 'web' && <WebControl serverName={name} />}
                {activeTab === 'stats' && <StatsView serverName={name} />}
            </div>
        </div>
    );
}
