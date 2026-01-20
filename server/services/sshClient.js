const { Client } = require('ssh2');

const executeCommand = (host, port, username, password, command) => {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }
                let output = '';
                stream.on('close', (code, signal) => {
                    conn.end();
                    resolve(output);
                }).on('data', (data) => {
                    output += data;
                }).stderr.on('data', (data) => {
                    output += data;
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host,
            port,
            username,
            password,
            readyTimeout: 5000
        });
    });
};

const getSystemStats = async (host, port, username, password) => {
    try {
        const cpucmd = "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'";
        const memcmd = "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2 }'";
        const diskcmd = "df -h / | awk 'NR==2 {print $5}' | sed 's/%//'";

        const [cpu, mem, disk] = await Promise.all([
            executeCommand(host, port, username, password, cpucmd),
            executeCommand(host, port, username, password, memcmd),
            executeCommand(host, port, username, password, diskcmd)
        ]);

        return {
            cpu: parseFloat(cpu) || 0,
            memory: parseFloat(mem) || 0,
            disk: parseFloat(disk) || 0
        };
    } catch (err) {
        console.error("Stats Error:", err.message);
        return { cpu: 0, memory: 0, disk: 0, error: err.message };
    }
};

module.exports = { executeCommand, getSystemStats };
