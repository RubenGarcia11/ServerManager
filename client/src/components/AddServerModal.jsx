import React, { useState } from 'react';
import { X, Server, Plus } from 'lucide-react';
import axios from 'axios';

export default function AddServerModal({ isOpen, onClose, onServerAdded }) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'ssh',
        host: '',
        port: '',
        user: '',
        password: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const defaultPorts = {
        ssh: 22,
        ftp: 21,
        web: 80
    };

    const handleTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            type,
            port: defaultPorts[type] || ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await axios.post('/api/servers/custom', formData);
            setFormData({ name: '', type: 'ssh', host: '', port: '', user: '', password: '' });
            onServerAdded();
            onClose();
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-700">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center space-x-3">
                        <Server className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold text-white">Añadir Servidor</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Server Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Servidor</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'ssh', label: 'SSH', color: 'emerald' },
                                { value: 'ftp', label: 'FTP', color: 'orange' },
                                { value: 'web', label: 'Web', color: 'blue' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleTypeChange(opt.value)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${formData.type === opt.value
                                            ? `bg-${opt.color}-600 text-white`
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                    style={formData.type === opt.value ? {
                                        backgroundColor: opt.value === 'ssh' ? '#059669' : opt.value === 'ftp' ? '#ea580c' : '#2563eb'
                                    } : {}}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            placeholder="Mi Servidor SSH"
                            required
                        />
                    </div>

                    {/* Host */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Host / IP</label>
                        <input
                            type="text"
                            value={formData.host}
                            onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            placeholder="192.168.1.100 o servidor.ejemplo.com"
                            required
                        />
                    </div>

                    {/* Port */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Puerto</label>
                        <input
                            type="number"
                            value={formData.port}
                            onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            placeholder={`${defaultPorts[formData.type]}`}
                        />
                    </div>

                    {/* User & Password */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Usuario</label>
                            <input
                                type="text"
                                value={formData.user}
                                onChange={(e) => setFormData(prev => ({ ...prev, user: e.target.value }))}
                                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                placeholder="root"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Contraseña</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white flex items-center space-x-2 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{saving ? 'Guardando...' : 'Añadir Servidor'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
