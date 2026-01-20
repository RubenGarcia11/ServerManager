import React, { useState } from 'react';
import { X, Server, Plus, Container, Globe } from 'lucide-react';
import axios from 'axios';

export default function AddServerModal({ isOpen, onClose, onServerAdded }) {
    const [mode, setMode] = useState('custom'); // 'custom' or 'docker'
    const [formData, setFormData] = useState({
        name: '',
        type: 'ssh',
        host: '',
        port: '',
        user: '',
        password: '',
        cpuLimit: 0.5,
        memoryLimit: 256
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const defaultPorts = { ssh: 22, ftp: 21, web: 80 };

    const handleTypeChange = (type) => {
        setFormData(prev => ({ ...prev, type, port: defaultPorts[type] || '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (mode === 'docker') {
                await axios.post('/api/servers/docker/create', {
                    name: formData.name,
                    type: formData.type,
                    cpuLimit: formData.cpuLimit,
                    memoryLimit: formData.memoryLimit
                });
            } else {
                await axios.post('/api/servers/custom', formData);
            }
            setFormData({ name: '', type: 'ssh', host: '', port: '', user: '', password: '', cpuLimit: 0.5, memoryLimit: 256 });
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-700 my-4">
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

                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Modo</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setMode('docker')}
                                className={`p-3 rounded-lg flex flex-col items-center space-y-1 transition-all ${mode === 'docker' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                <Container className="w-5 h-5" />
                                <span className="text-sm font-medium">Docker Local</span>
                                <span className="text-xs opacity-75">Crear contenedor</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('custom')}
                                className={`p-3 rounded-lg flex flex-col items-center space-y-1 transition-all ${mode === 'custom' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                <Globe className="w-5 h-5" />
                                <span className="text-sm font-medium">Servidor Externo</span>
                                <span className="text-xs opacity-75">Conectar remoto</span>
                            </button>
                        </div>
                    </div>

                    {/* Server Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Servidor</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'ssh', label: 'SSH', color: '#059669' },
                                { value: 'ftp', label: 'FTP', color: '#ea580c' },
                                { value: 'web', label: 'Web', color: '#2563eb' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleTypeChange(opt.value)}
                                    className="px-4 py-2 rounded-lg font-medium transition-all"
                                    style={{
                                        backgroundColor: formData.type === opt.value ? opt.color : '#334155',
                                        color: formData.type === opt.value ? 'white' : '#94a3b8'
                                    }}
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
                            placeholder={mode === 'docker' ? 'mi-servidor-ssh' : 'Mi Servidor SSH'}
                            required
                        />
                    </div>

                    {/* Docker specific options */}
                    {mode === 'docker' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    CPU Limit: <span className="text-indigo-400">{formData.cpuLimit} cores</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="2"
                                    step="0.1"
                                    value={formData.cpuLimit}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cpuLimit: parseFloat(e.target.value) }))}
                                    className="w-full h-2 bg-slate-700 rounded-lg accent-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Memoria: <span className="text-cyan-400">{formData.memoryLimit} MB</span>
                                </label>
                                <input
                                    type="range"
                                    min="64"
                                    max="1024"
                                    step="64"
                                    value={formData.memoryLimit}
                                    onChange={(e) => setFormData(prev => ({ ...prev, memoryLimit: parseInt(e.target.value) }))}
                                    className="w-full h-2 bg-slate-700 rounded-lg accent-cyan-500"
                                />
                            </div>
                        </>
                    )}

                    {/* Custom server specific options */}
                    {mode === 'custom' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Host / IP</label>
                                <input
                                    type="text"
                                    value={formData.host}
                                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                    placeholder="192.168.1.100"
                                    required
                                />
                            </div>
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
                        </>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`px-4 py-2 rounded-lg text-white flex items-center space-x-2 disabled:opacity-50 ${mode === 'docker' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                        >
                            <Plus className="w-4 h-4" />
                            <span>{saving ? 'Creando...' : mode === 'docker' ? 'Crear Contenedor' : 'Añadir Servidor'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
