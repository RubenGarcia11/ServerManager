import React from 'react';
import { Server, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <header className="border-b border-indigo-900/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-3 group">
                    <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                        <Server className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        Panel de Control Nexus
                    </span>
                </Link>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-emerald-400">Sistema en Línea</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
