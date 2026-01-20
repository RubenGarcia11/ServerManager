import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';
import 'xterm/css/xterm.css';

export default function TerminalComponent({ serverName }) {
    const terminalRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#020617',
                foreground: '#f8fafc',
                cursor: '#6366f1'
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        const socket = io();
        socketRef.current = socket;

        socket.on('connect', () => {
            term.write(`\r\nConectando a ${serverName}...\r\n`);

            // Backend runs inside Docker network, so we use container names directly
            socket.emit('start-terminal', {
                host: serverName, // Container name works inside Docker network
                port: 22,         // Internal port, not mapped port
                username: 'admin',
                password: 'password'
            });
        });

        socket.on('data', (data) => {
            term.write(data);
        });

        term.onData(data => {
            socket.emit('input', data);
        });

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            socket.disconnect();
            term.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [serverName]);

    return <div ref={terminalRef} className="h-full w-full" />;
}
