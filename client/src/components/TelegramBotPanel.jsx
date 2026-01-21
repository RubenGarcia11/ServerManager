import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bot, Send, Trash2, RefreshCw, User, MessageSquare, Clock, Filter, ChevronDown, AlertCircle } from 'lucide-react';
import { useLanguage } from './Header';
import { Link } from 'react-router-dom';

// Use relative URL in production (Docker), localhost:3000 in development
const API_URL = window.location.port === '5173' ? 'http://localhost:3000' : '';

export default function TelegramBotPanel() {
    const { t } = useLanguage();
    const [botStatus, setBotStatus] = useState({ active: false });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showSendPanel, setShowSendPanel] = useState(false);
    const [sendForm, setSendForm] = useState({ chatId: '', message: '' });
    const [sending, setSending] = useState(false);
    const [activeChats, setActiveChats] = useState([]);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch bot status
    const fetchStatus = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/telegram/status`);
            setBotStatus(res.data);
        } catch (e) {
            setBotStatus({ active: false, error: e.message });
        }
    }, []);

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/telegram/logs?limit=200`);
            setLogs(res.data);
        } catch (e) {
            console.error('Error fetching logs:', e);
        }
    }, []);

    // Fetch active chats
    const fetchChats = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/telegram/chats`);
            setActiveChats(res.data);
        } catch (e) {
            console.error('Error fetching chats:', e);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            await Promise.all([fetchStatus(), fetchLogs(), fetchChats()]);
            setLoading(false);
        };
        fetchAll();
    }, [fetchStatus, fetchLogs, fetchChats]);

    // Auto refresh every 5 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchLogs();
            fetchStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs, fetchStatus]);

    // Clear logs
    const handleClearLogs = async () => {
        if (!confirm('¿Eliminar todos los logs?')) return;
        try {
            await axios.delete(`${API_URL}/api/telegram/logs`);
            setLogs([]);
        } catch (e) {
            alert('Error al limpiar logs');
        }
    };

    // Send message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!sendForm.chatId || !sendForm.message) return;

        setSending(true);
        try {
            await axios.post(`${API_URL}/api/telegram/send`, {
                chatId: sendForm.chatId,
                message: sendForm.message
            });
            setSendForm(prev => ({ ...prev, message: '' }));
            fetchLogs();
        } catch (e) {
            alert('Error al enviar mensaje: ' + e.message);
        }
        setSending(false);
    };

    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (!filter) return true;
        const searchLower = filter.toLowerCase();
        return (
            log.message?.toLowerCase().includes(searchLower) ||
            log.userName?.toLowerCase().includes(searchLower) ||
            log.firstName?.toLowerCase().includes(searchLower) ||
            log.response?.toLowerCase().includes(searchLower)
        );
    });

    // Format timestamp
    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                        ← Volver
                    </Link>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                            <Bot className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Bot de Telegram</h1>
                            <p className="text-slate-400 text-sm">
                                {botStatus.username ? `@${botStatus.username}` : 'Control y logs de conversaciones'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${botStatus.active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${botStatus.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">
                            {botStatus.active ? 'Bot Activo' : 'Bot Inactivo'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Total Mensajes</p>
                            <p className="text-2xl font-bold text-white">{logs.length}</p>
                        </div>
                        <MessageSquare className="w-8 h-8 text-indigo-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Usuarios Únicos</p>
                            <p className="text-2xl font-bold text-white">{activeChats.length}</p>
                        </div>
                        <User className="w-8 h-8 text-cyan-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Comandos</p>
                            <p className="text-2xl font-bold text-white">
                                {logs.filter(l => l.isCommand).length}
                            </p>
                        </div>
                        <Bot className="w-8 h-8 text-purple-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Auto-refresh</p>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`text-lg font-medium ${autoRefresh ? 'text-emerald-400' : 'text-slate-500'}`}
                            >
                                {autoRefresh ? 'Activado' : 'Pausado'}
                            </button>
                        </div>
                        <RefreshCw className={`w-8 h-8 text-emerald-400 opacity-50 ${autoRefresh ? 'animate-spin' : ''}`}
                            style={{ animationDuration: '3s' }} />
                    </div>
                </div>
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center space-x-4">
                    {/* Filter input */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar en logs..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                        />
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={() => { fetchLogs(); fetchStatus(); }}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Actualizar</span>
                    </button>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Send message button */}
                    <button
                        onClick={() => setShowSendPanel(!showSendPanel)}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        <span>Enviar Mensaje</span>
                    </button>

                    {/* Clear logs button */}
                    <button
                        onClick={handleClearLogs}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Limpiar</span>
                    </button>
                </div>
            </div>

            {/* Send message panel */}
            {showSendPanel && (
                <div className="bg-slate-800/50 border border-indigo-500/30 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                        <Send className="w-4 h-4 text-indigo-400" />
                        <span>Enviar Mensaje</span>
                    </h3>
                    <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm text-slate-400">Chat ID</label>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={sendForm.chatId}
                                    onChange={(e) => setSendForm(prev => ({ ...prev, chatId: e.target.value }))}
                                    placeholder="ID del chat"
                                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {activeChats.length > 0 && (
                                    <select
                                        onChange={(e) => setSendForm(prev => ({ ...prev, chatId: e.target.value }))}
                                        className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {activeChats.map(chat => (
                                            <option key={chat.chatId} value={chat.chatId}>
                                                {chat.firstName} {chat.userName ? `(@${chat.userName})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="flex-[2] space-y-2">
                            <label className="text-sm text-slate-400">Mensaje</label>
                            <input
                                type="text"
                                value={sendForm.message}
                                onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="Escribe tu mensaje..."
                                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={sending || !sendForm.chatId || !sendForm.message}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                        >
                            {sending ? 'Enviando...' : 'Enviar'}
                        </button>
                    </form>
                </div>
            )}

            {/* Logs table */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="text-white font-medium">Historial de Conversaciones</h3>
                    <span className="text-sm text-slate-400">
                        {filteredLogs.length} {filteredLogs.length === 1 ? 'mensaje' : 'mensajes'}
                    </span>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                        <p>No hay mensajes registrados</p>
                        <p className="text-sm mt-1">Los mensajes aparecerán aquí cuando los usuarios interactúen con el bot</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Hora
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Usuario
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Mensaje
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Respuesta
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-white">{formatTime(log.timestamp)}</span>
                                                <span className="text-xs text-slate-500">{formatDate(log.timestamp)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-sm font-medium">
                                                        {log.firstName?.charAt(0) || '?'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white">{log.firstName} {log.lastName}</p>
                                                    {log.userName && (
                                                        <p className="text-xs text-indigo-400">@{log.userName}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start space-x-2">
                                                {log.isCommand && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded">
                                                        CMD
                                                    </span>
                                                )}
                                                <span className="text-sm text-slate-300 max-w-xs truncate" title={log.message}>
                                                    {log.message}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-slate-400 max-w-xs truncate block" title={log.response}>
                                                {log.response || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
