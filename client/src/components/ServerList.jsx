import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ServerCard from './ServerCard';
import { RefreshCw } from 'lucide-react';

export default function ServerList() {
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);

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
                <button onClick={fetchServers} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servers.map(server => (
                    <ServerCard key={server.id} server={server} onRefresh={fetchServers} />
                ))}
            </div>
        </div>
    );
}
