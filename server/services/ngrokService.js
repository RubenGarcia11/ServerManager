const ngrok = require('@ngrok/ngrok');

let activeTunnels = {}; // Track active tunnels by target
let listener = null;

/**
 * Start an ngrok tunnel to a specific host:port
 */
const startTunnel = async (targetHost, targetPort) => {
    const key = `${targetHost}:${targetPort}`;

    // Return existing tunnel if active
    if (activeTunnels[key] && activeTunnels[key].url) {
        return activeTunnels[key];
    }

    const authtoken = process.env.NGROK_AUTHTOKEN;
    if (!authtoken) {
        throw new Error('NGROK_AUTHTOKEN not configured');
    }

    try {
        // Connect using the @ngrok/ngrok package
        listener = await ngrok.forward({
            addr: `${targetHost}:${targetPort}`,
            authtoken: authtoken,
            proto: 'http'
        });

        const url = listener.url();

        activeTunnels[key] = {
            url: url,
            listener: listener,
            createdAt: Date.now()
        };

        console.log(`🌐 Ngrok tunnel created: ${url} -> ${targetHost}:${targetPort}`);
        return activeTunnels[key];
    } catch (error) {
        console.error('Ngrok tunnel error:', error.message);
        throw error;
    }
};

/**
 * Stop a specific tunnel
 */
const stopTunnel = async (targetHost, targetPort) => {
    const key = `${targetHost}:${targetPort}`;
    if (activeTunnels[key] && activeTunnels[key].listener) {
        try {
            await activeTunnels[key].listener.close();
            delete activeTunnels[key];
            console.log(`🔌 Ngrok tunnel stopped: ${key}`);
        } catch (e) {
            console.error('Error stopping tunnel:', e.message);
        }
    }
};

/**
 * Stop all tunnels
 */
const stopAllTunnels = async () => {
    for (const key of Object.keys(activeTunnels)) {
        if (activeTunnels[key].listener) {
            try {
                await activeTunnels[key].listener.close();
            } catch (e) {
                // ignore
            }
        }
    }
    activeTunnels = {};
    console.log('🔌 All ngrok tunnels stopped');
};

/**
 * Get active tunnel for a target
 */
const getTunnel = (targetHost, targetPort) => {
    const key = `${targetHost}:${targetPort}`;
    return activeTunnels[key] || null;
};

module.exports = { startTunnel, stopTunnel, stopAllTunnels, getTunnel };
