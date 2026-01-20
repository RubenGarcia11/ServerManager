import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Folder, File, Trash, Upload, ArrowUp, RefreshCw, Edit, X, Save, Download, Image, PenLine } from 'lucide-react';

export default function FileManager({ serverName }) {
    const [files, setFiles] = useState([]);
    const [path, setPath] = useState('/archivos');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Editor state
    const [editingFile, setEditingFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [saving, setSaving] = useState(false);

    // Rename state
    const [renamingFile, setRenamingFile] = useState(null);
    const [newFileName, setNewFileName] = useState('');

    // Preview state
    const [previewImage, setPreviewImage] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const ftpCredentials = {
        host: serverName,
        port: 21,
        user: 'ftpuser',
        password: 'ftp123'
    };

    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post('/api/ftp/list', {
                ...ftpCredentials,
                path
            });
            setFiles(res.data);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename) => {
        if (!confirm(`¿Eliminar ${filename}?`)) return;
        try {
            await axios.post('/api/ftp/delete', {
                ...ftpCredentials,
                path: `${path === '/' ? '' : path}/${filename}`
            });
            fetchFiles();
        } catch (e) {
            alert(e.response?.data?.error || e.message);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('host', serverName);
        formData.append('port', '21');
        formData.append('user', 'ftpuser');
        formData.append('password', 'ftp123');
        formData.append('remotePath', `${path === '/' ? '' : path}/${file.name}`);

        try {
            await axios.post('/api/ftp/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchFiles();
        } catch (e) {
            alert('Error al subir: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleEditFile = async (filename) => {
        const filePath = `${path === '/' ? '' : path}/${filename}`;
        try {
            const res = await axios.post('/api/ftp/read', {
                ...ftpCredentials,
                path: filePath
            });
            setFileContent(res.data.content);
            setEditingFile({ name: filename, path: filePath });
        } catch (e) {
            alert('Error al leer archivo: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleSaveFile = async () => {
        if (!editingFile) return;
        setSaving(true);
        try {
            await axios.post('/api/ftp/save', {
                ...ftpCredentials,
                path: editingFile.path,
                content: fileContent
            });
            setEditingFile(null);
            setFileContent('');
            fetchFiles();
        } catch (e) {
            alert('Error al guardar: ' + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async (filename) => {
        const filePath = `${path === '/' ? '' : path}/${filename}`;
        try {
            const response = await axios.post('/api/ftp/download', {
                ...ftpCredentials,
                path: filePath
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('Error al descargar: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleRename = async () => {
        if (!renamingFile || !newFileName.trim()) return;
        const oldPath = `${path === '/' ? '' : path}/${renamingFile}`;
        const newPath = `${path === '/' ? '' : path}/${newFileName.trim()}`;

        try {
            await axios.post('/api/ftp/rename', {
                ...ftpCredentials,
                oldPath,
                newPath
            });
            setRenamingFile(null);
            setNewFileName('');
            fetchFiles();
        } catch (e) {
            alert('Error al renombrar: ' + (e.response?.data?.error || e.message));
        }
    };

    const handlePreview = async (filename) => {
        const filePath = `${path === '/' ? '' : path}/${filename}`;
        setPreviewLoading(true);
        try {
            const res = await axios.post('/api/ftp/preview', {
                ...ftpCredentials,
                path: filePath
            });
            setPreviewImage({ name: filename, data: res.data.data });
        } catch (e) {
            alert('Error al previsualizar: ' + (e.response?.data?.error || e.message));
        } finally {
            setPreviewLoading(false);
        }
    };

    const isTextFile = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        return ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'sh', 'yaml', 'yml', 'conf', 'cfg', 'ini', 'log'].includes(ext);
    };

    const isImageFile = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
    };

    useEffect(() => { fetchFiles(); }, [path, serverName]);

    // Image Preview Modal
    if (previewImage) {
        return (
            <div className="flex flex-col h-full bg-slate-900 text-white">
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
                    <div className="flex items-center space-x-3">
                        <Image className="w-5 h-5 text-purple-400" />
                        <span className="font-medium">{previewImage.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleDownload(previewImage.name)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded flex items-center space-x-2 text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            <span>Descargar</span>
                        </button>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
                    <img
                        src={previewImage.data}
                        alt={previewImage.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </div>
            </div>
        );
    }

    // Editor Modal
    if (editingFile) {
        return (
            <div className="flex flex-col h-full bg-slate-900 text-white">
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
                    <div className="flex items-center space-x-3">
                        <Edit className="w-5 h-5 text-indigo-400" />
                        <span className="font-medium">{editingFile.name}</span>
                        <span className="text-xs text-slate-500">{editingFile.path}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleSaveFile}
                            disabled={saving}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded flex items-center space-x-2 text-sm font-medium disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                        </button>
                        <button
                            onClick={() => { setEditingFile(null); setFileContent(''); }}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="flex-1 w-full p-4 bg-slate-950 text-slate-200 font-mono text-sm resize-none focus:outline-none"
                    placeholder="Contenido del archivo..."
                    spellCheck={false}
                />
            </div>
        );
    }

    // Rename Modal
    if (renamingFile) {
        return (
            <div className="flex flex-col h-full bg-slate-900 text-white items-center justify-center">
                <div className="bg-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full mx-4">
                    <div className="flex items-center space-x-3 mb-6">
                        <PenLine className="w-6 h-6 text-amber-400" />
                        <h3 className="text-lg font-semibold">Renombrar archivo</h3>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">Archivo actual: <span className="text-slate-200">{renamingFile}</span></p>
                    <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-4"
                        placeholder="Nuevo nombre..."
                        autoFocus
                    />
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => { setRenamingFile(null); setNewFileName(''); }}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRename}
                            disabled={!newFileName.trim()}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg disabled:opacity-50"
                        >
                            Renombrar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white p-4">
            <div className="flex items-center justify-between mb-4 p-2 bg-slate-800 rounded">
                <span className="text-slate-400 font-mono text-sm">ftp://{serverName}{path}</span>
                <button onClick={fetchFiles} className="p-1 hover:bg-slate-700 rounded">
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                    Error: {error}
                </div>
            )}

            <div className="flex-1 overflow-auto rounded bg-slate-950 border border-slate-800 p-2">
                <table className="w-full text-left text-sm">
                    <thead className="text-slate-500 border-b border-slate-800">
                        <tr>
                            <th className="p-2 w-8"></th>
                            <th className="p-2">Nombre</th>
                            <th className="p-2 w-20">Tamaño</th>
                            <th className="p-2 w-40">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {path !== '/' && (
                            <tr className="hover:bg-slate-800/50 cursor-pointer" onClick={() => setPath(path.split('/').slice(0, -1).join('/') || '/')}>
                                <td className="p-2"><ArrowUp className="w-4 h-4 text-slate-400" /></td>
                                <td className="p-2">..</td>
                                <td className="p-2">-</td>
                                <td className="p-2"></td>
                            </tr>
                        )}
                        {files.map(f => (
                            <tr key={f.name} className="hover:bg-slate-800/50 group">
                                <td className="p-2">
                                    {f.isDirectory ? <Folder className="w-4 h-4 text-yellow-500" /> :
                                        isImageFile(f.name) ? <Image className="w-4 h-4 text-purple-400" /> :
                                            <File className="w-4 h-4 text-blue-400" />}
                                </td>
                                <td className="p-2 cursor-pointer font-medium" onClick={() => {
                                    if (f.isDirectory) setPath(`${path === '/' ? '' : path}/${f.name}`);
                                    else if (isImageFile(f.name)) handlePreview(f.name);
                                }}>
                                    {f.name}
                                </td>
                                <td className="p-2 text-slate-500">{f.isDirectory ? '-' : `${(f.size / 1024).toFixed(1)} KB`}</td>
                                <td className="p-2">
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!f.isDirectory && isImageFile(f.name) && (
                                            <button onClick={() => handlePreview(f.name)} className="p-1 text-purple-400 hover:bg-purple-500/20 rounded" title="Previsualizar">
                                                <Image className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!f.isDirectory && isTextFile(f.name) && (
                                            <button onClick={() => handleEditFile(f.name)} className="p-1 text-indigo-400 hover:bg-indigo-500/20 rounded" title="Editar">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!f.isDirectory && (
                                            <>
                                                <button onClick={() => handleDownload(f.name)} className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded" title="Descargar">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setRenamingFile(f.name); setNewFileName(f.name); }} className="p-1 text-amber-400 hover:bg-amber-500/20 rounded" title="Renombrar">
                                                    <PenLine className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(f.name)} className="p-1 text-red-400 hover:bg-red-500/20 rounded" title="Eliminar">
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {files.length === 0 && !loading && (
                            <tr><td colSpan={4} className="p-4 text-center text-slate-500">Carpeta vacía</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 border-t border-slate-800 flex justify-end">
                <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 px-4 py-2 rounded flex items-center space-x-2 hover:bg-indigo-500">
                    <Upload className="w-4 h-4" /> <span>Subir Archivo</span>
                </button>
            </div>
        </div>
    );
}
