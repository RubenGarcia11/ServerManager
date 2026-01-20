import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';
import 'xterm/css/xterm.css';

export default function TerminalComponent({ serverName }) {
    const terminalRef = useRef(null);
    const terminalContainerRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!terminalContainerRef.current) return;

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
        term.open(terminalContainerRef.current);

        // Initial fit with small delay to ensure container is rendered
        const initialFitTimeout = setTimeout(() => {
            fitAddon.fit();
        }, 100);

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

        // Debounced resize handler
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                try {
                    fitAddon.fit();
                } catch (e) {
                    // Ignore fit errors during cleanup
                }
            }, 50);
        };

        // Use ResizeObserver to detect container size changes
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(terminalContainerRef.current);

        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(initialFitTimeout);
            clearTimeout(resizeTimeout);
            resizeObserver.disconnect();
            socket.disconnect();
            term.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [serverName]);

    return (
        <div ref={terminalRef} className="h-full w-full flex-1 overflow-hidden">
            <div
                ref={terminalContainerRef}
                className="h-full w-full"
                style={{ minHeight: '400px' }}
            />
        </div>
    );
}
