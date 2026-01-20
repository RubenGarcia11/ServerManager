import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { Server, Settings, Moon, Sun, Bell, BellOff, Languages, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

// Language context for translations
export const LanguageContext = createContext();

const translations = {
    es: {
        systemOnline: 'Sistema en Línea',
        settings: 'Configuración',
        darkMode: 'Modo Oscuro',
        notifications: 'Notificaciones',
        language: 'Idioma',
        about: 'Acerca de',
        controlPanel: 'Panel de Control Nexus',
        addServer: 'Añadir Servidor',
        newFolder: 'Nueva Carpeta',
        uploadFile: 'Subir Archivo',
        deploy: 'Desplegar',
        deploying: 'Desplegando...',
        deployed: '¡Desplegado!',
        accessLogs: 'Logs de Acceso',
        htmlFilesFromFtp: 'Archivos HTML del FTP',
        noHtmlFiles: 'No hay archivos HTML en el servidor FTP. Sube archivos .html al servidor FTP para poder desplegarlos aquí.',
        openSite: 'Abrir Sitio',
        active: 'Activo',
        unknown: 'Desconocido'
    },
    en: {
        systemOnline: 'System Online',
        settings: 'Settings',
        darkMode: 'Dark Mode',
        notifications: 'Notifications',
        language: 'Language',
        about: 'About',
        controlPanel: 'Nexus Control Panel',
        addServer: 'Add Server',
        newFolder: 'New Folder',
        uploadFile: 'Upload File',
        deploy: 'Deploy',
        deploying: 'Deploying...',
        deployed: 'Deployed!',
        accessLogs: 'Access Logs',
        htmlFilesFromFtp: 'HTML Files from FTP',
        noHtmlFiles: 'No HTML files on FTP server. Upload .html files to the FTP server to deploy them here.',
        openSite: 'Open Site',
        active: 'Active',
        unknown: 'Unknown'
    }
};

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'es');

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key) => translations[language]?.[key] || translations.es[key] || key;

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false');
    const [notifications, setNotifications] = useState(true);
    const { language, setLanguage, t } = useLanguage();
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
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    return (
        <header className="border-b border-indigo-900/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-3 group">
                    <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                        <Server className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        {t('controlPanel')}
                    </span>
                </Link>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-emerald-400">{t('systemOnline')}</span>
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
                            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden settings-dropdown">
                                <div className="p-3 border-b border-slate-700">
                                    <h3 className="text-sm font-semibold text-white">{t('settings')}</h3>
                                </div>

                                {/* Dark Mode Toggle */}
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        {darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                                        <span className="text-sm text-slate-300">{t('darkMode')}</span>
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
                                        <span className="text-sm text-slate-300">{t('notifications')}</span>
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
                                            <span className="text-sm text-slate-300">{t('language')}</span>
                                        </div>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="bg-slate-700 text-sm text-white px-3 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                        >
                                            <option value="es">🇪🇸 Español</option>
                                            <option value="en">🇬🇧 English</option>
                                        </select>
                                    </div>
                                </div>

                                {/* About */}
                                <button className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors border-t border-slate-700">
                                    <Info className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-300">{t('about')}</span>
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
