import React, { useState, useRef, useEffect } from 'react';
import { Server, Settings, Moon, Sun, Bell, BellOff, Languages, Info, LogOut, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [language, setLanguage] = useState('es');
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Apply dark/light mode
    useEffect(() => {
        document.documentElement.classList.toggle('light-mode', !darkMode);
    }, [darkMode]);

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

                    {/* Settings Button */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className={`p-2 rounded-lg transition-colors ${menuOpen ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                        >
                            <Settings className={`w-5 h-5 text-slate-400 transition-transform ${menuOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                                <div className="p-3 border-b border-slate-700">
                                    <h3 className="text-sm font-semibold text-white">Configuración</h3>
                                </div>

                                {/* Dark Mode Toggle */}
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        {darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                                        <span className="text-sm text-slate-300">Modo Oscuro</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-600'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </button>

                                {/* Notifications Toggle */}
                                <button
                                    onClick={() => setNotifications(!notifications)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        {notifications ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                                        <span className="text-sm text-slate-300">Notificaciones</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${notifications ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </button>

                                {/* Language */}
                                <div className="px-4 py-3 hover:bg-slate-700/50 transition-colors border-t border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Languages className="w-4 h-4 text-cyan-400" />
                                            <span className="text-sm text-slate-300">Idioma</span>
                                        </div>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="bg-slate-700 text-sm text-white px-2 py-1 rounded border-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        >
                                            <option value="es">Español</option>
                                            <option value="en">English</option>
                                        </select>
                                    </div>
                                </div>

                                {/* About */}
                                <button className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors border-t border-slate-700">
                                    <Info className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-300">Acerca de</span>
                                    <span className="text-xs text-slate-500 ml-auto">v1.0.0</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
