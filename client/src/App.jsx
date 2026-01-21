import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Copy, HardDrive, Activity, Power, Globe, Folder, Play, Square } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import Header, { LanguageProvider } from './components/Header';
import ServerList from './components/ServerList';
import ServerDetail from './components/ServerDetail';
import TelegramBotPanel from './components/TelegramBotPanel';

function App() {
    return (
        <LanguageProvider>
            <Router>
                <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
                    <Header />
                    <main className="container mx-auto p-6">
                        <Routes>
                            <Route path="/" element={<ServerList />} />
                            <Route path="/server/:name" element={<ServerDetail />} />
                            <Route path="/telegram" element={<TelegramBotPanel />} />
                        </Routes>
                    </main>
                </div>
            </Router>
        </LanguageProvider>
    );
}

export default App;

