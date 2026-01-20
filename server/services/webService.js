// Web Server Service
// Since the web server container also has SSH, we can reuse sshClient for logs and status checks
// but we wrap it in specific web-oriented functions.

const { executeCommand } = require('./sshClient');

const getNginxStatus = async (host, port, user, pass) => {
    try {
        const output = await executeCommand(host, port, user, pass, "service nginx status");
        return { status: output.includes("is running") ? "running" : "stopped", raw: output };
    } catch (e) {
        return { status: "error", error: e.message };
    }
};

const getAccessLogs = async (host, port, user, pass, lines = 20) => {
    try {
        const output = await executeCommand(host, port, user, pass, `tail -n ${lines} /var/log/nginx/access.log`);
        return output;
    } catch (e) {
        return "Error fetching logs: " + e.message;
    }
};

module.exports = { getNginxStatus, getAccessLogs };
