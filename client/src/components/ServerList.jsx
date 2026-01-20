import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ServerCard from './ServerCard';
import AddServerModal from './AddServerModal';
import { RefreshCw, Plus } from 'lucide-react';

export default function ServerList() {
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchServers = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/servers');
            setServers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(fetchServers, 5000);
        fetchServers();
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Panel de Control</h1>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center space-x-2 text-white font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Añadir Servidor</span>
                    </button>
                    <button onClick={fetchServers} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servers.map(server => (
                    <ServerCard key={server.id} server={server} onRefresh={fetchServers} />
                ))}
            </div>

            <AddServerModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onServerAdded={fetchServers}
            />
        </div>
    );
}

