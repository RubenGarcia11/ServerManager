import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, HardDrive, RefreshCw, Save, AlertCircle, Check, Trash2 } from 'lucide-react';

export default function ResourcesPanel({ serverName, onRefresh }) {
    const [resources, setResources] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [cpuLimit, setCpuLimit] = useState(0.5);
    const [memoryLimit, setMemoryLimit] = useState(256);

    const fetchResources = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/api/servers/${serverName}/inspect`);
            setResources(data);

            // Convert from Docker format
            const cpu = data.resources.cpuQuota > 0
                ? data.resources.cpuQuota / data.resources.cpuPeriod
                : 0.5;
            const mem = data.resources.memoryLimit > 0
                ? data.resources.memoryLimit / (1024 * 1024)
                : 256;

            setCpuLimit(cpu);
            setMemoryLimit(mem);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await axios.put(`/api/servers/${serverName}/resources`, {
                cpuLimit,
                memoryLimit
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRestart = async () => {
        if (!confirm('¿Reiniciar el servidor para aplicar los cambios?')) return;
        try {
            await axios.post(`/api/servers/${serverName}/restart`);
            onRefresh?.();
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`¿Eliminar permanentemente el servidor ${serverName}?`)) return;
        try {
            await axios.delete(`/api/servers/docker/${serverName}`);
            onRefresh?.();
            window.location.href = '/';
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [serverName]);

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Cargando recursos...
            </div>
        );
    }

    return (
        <div className="p-6 text-white space-y-6 overflow-auto">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    <span>Recursos del Contenedor</span>
                </h3>
                <button onClick={fetchResources} className="p-2 hover:bg-slate-700 rounded">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center space-x-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg flex items-center space-x-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>Recursos actualizados correctamente</span>
                </div>
            )}

            {/* CPU Limit */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-300">Límite de CPU</label>
                    <span className="text-indigo-400 font-mono">{cpuLimit.toFixed(2)} cores</span>
                </div>
                <input
                    type="range"
                    min="0.1"
                    max="4"
                    step="0.1"
                    value={cpuLimit}
                    onChange={(e) => setCpuLimit(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0.1</span>
                    <span>1.0</span>
                    <span>2.0</span>
                    <span>4.0</span>
                </div>
            </div>

            {/* Memory Limit */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-300">Límite de Memoria</label>
                    <span className="text-cyan-400 font-mono">{memoryLimit} MB</span>
                </div>
                <input
                    type="range"
                    min="64"
                    max="2048"
                    step="64"
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>64 MB</span>
                    <span>512 MB</span>
                    <span>1 GB</span>
                    <span>2 GB</span>
                </div>
            </div>

            {/* Current Info */}
            {resources && (
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Información Actual</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span className="text-slate-500">Estado:</span>
                            <span className={`ml-2 ${resources.state === 'running' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {resources.state}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500">Imagen:</span>
                            <span className="ml-2 text-slate-300">{resources.image?.split(':')[0]}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
                <button
                    onClick={handleRestart}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center space-x-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reiniciar</span>
                </button>
                <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg flex items-center space-x-2"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                </button>
            </div>
        </div>
    );
}
