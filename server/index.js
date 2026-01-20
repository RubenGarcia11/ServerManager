const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dockerService = require('./services/dockerControl');
const sshService = require('./services/sshClient');
const ftpService = require('./services/ftpService');
const webService = require('./services/webService');
const telegramBot = require('./services/telegramBot');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- Terminal Socket ---
io.on('connection', (socket) => {
  console.log('Client connected to socket');
  let sshStream = null;
  let conn = null;

  socket.on('start-terminal', async ({ host, port, username, password }) => {
    const { Client } = require('ssh2');
    conn = new Client();
    conn.on('ready', () => {
      socket.emit('data', '\r\n*** SSH CONNECTION ESTABLISHED ***\r\n');
      conn.shell((err, stream) => {
        if (err) return socket.emit('data', '\r\n*** SSH SHELL ERROR ***\r\n');
        sshStream = stream;
        stream.on('close', () => {
          conn.end();
          socket.emit('data', '\r\n*** DISCONNECTED ***\r\n');
        }).on('data', (data) => {
          socket.emit('data', data.toString('utf-8'));
        }).stderr.on('data', (data) => {
          socket.emit('data', data.toString('utf-8'));
        });
      });
    }).on('error', (err) => {
      socket.emit('data', `\r\n*** CONNECTION ERROR: ${err.message} ***\r\n`);
    }).connect({ host, port, username, password });
  });

  socket.on('input', (data) => {
    if (sshStream) sshStream.write(data);
  });

  socket.on('disconnect', () => {
    if (conn) conn.end();
  });
});

// --- API Endpoints ---

// Docker Container Control
app.get('/api/servers', async (req, res) => {
  try {
    const containers = await dockerService.listContainers();
    // Enrich with Type based on name
    const mapped = containers.map(c => ({
      id: c.Id,
      name: c.Names[0].replace('/', ''),
      state: c.State,
      status: c.Status,
      type: c.Names[0].includes('ssh') ? 'ssh' : c.Names[0].includes('ftp') ? 'ftp' : 'web'
    }));
    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/servers/:name/start', async (req, res) => {
  try {
    const result = await dockerService.startContainer(req.params.name);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/servers/:name/stop', async (req, res) => {
  try {
    const result = await dockerService.stopContainer(req.params.name);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/servers/:name/stats', async (req, res) => {
  // Determine connection details based on name (Hardcoded for this exercise)
  let port = 22;
  // In docker network, we can reach them by container_name:22.
  // Dashboard is in the same network.
  const host = req.params.name;
  const user = 'root'; // using root for simplicity in stats
  const password = 'password';

  try {
    const stats = await sshService.getSystemStats(host, port, user, password);
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// FTP Endpoints
app.post('/api/ftp/list', async (req, res) => {
  const { host, port, user, password, path } = req.body;
  try {
    const list = await ftpService.listFiles(host, port || 21, user, password, path);
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ftp/delete', async (req, res) => {
  const { host, port, user, password, path } = req.body;
  try {
    await ftpService.deleteFile(host, port || 21, user, password, path);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FTP Upload - using multipart form
const multer = require('multer');
const upload = multer({ dest: '/tmp/uploads/' });
app.post('/api/ftp/upload', upload.single('file'), async (req, res) => {
  const { host, port, user, password, remotePath } = req.body;
  const localPath = req.file?.path;
  if (!localPath) return res.status(400).json({ error: 'No file provided' });
  try {
    await ftpService.uploadFile(host, parseInt(port) || 21, user, password, localPath, remotePath);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FTP Read file content
app.post('/api/ftp/read', async (req, res) => {
  const { host, port, user, password, path } = req.body;
  try {
    const content = await ftpService.downloadFile(host, port || 21, user, password, path);
    res.json({ content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FTP Save file content
app.post('/api/ftp/save', async (req, res) => {
  const { host, port, user, password, path, content } = req.body;
  try {
    await ftpService.saveFile(host, port || 21, user, password, path, content);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FTP Download file (returns file as attachment)
app.post('/api/ftp/download', async (req, res) => {
  const { host, port, user, password, path } = req.body;
  try {
    const localPath = await ftpService.downloadToPath(host, port || 21, user, password, path);
    const filename = path.split('/').pop();
    res.download(localPath, filename, (err) => {
      // Cleanup after download
      require('fs').unlink(localPath, () => { });
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FTP Rename file
app.post('/api/ftp/rename', async (req, res) => {
  const { host, port, user, password, oldPath, newPath } = req.body;
  try {
    await ftpService.renameFile(host, port || 21, user, password, oldPath, newPath);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FTP Preview image (returns base64)
app.post('/api/ftp/preview', async (req, res) => {
  const { host, port, user, password, path } = req.body;
  try {
    const localPath = await ftpService.downloadToPath(host, port || 21, user, password, path);
    const fs = require('fs');
    const data = fs.readFileSync(localPath);
    const base64 = data.toString('base64');
    const ext = path.split('.').pop().toLowerCase();
    const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    fs.unlinkSync(localPath);
    res.json({ data: `data:${mime};base64,${base64}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Web Endpoints
app.post('/api/web/status', async (req, res) => {
  const { host } = req.body;
  // ssh creds for internal check
  try {
    const status = await webService.getNginxStatus(host, 22, 'root', 'password');
    res.json(status);
  } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.post('/api/web/logs', async (req, res) => {
  const { host } = req.body;
  try {
    const logs = await webService.getAccessLogs(host, 22, 'root', 'password');
    res.json({ logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Initialize Telegram Bot (only if token is provided)
if (process.env.TELEGRAM_BOT_TOKEN) {
  telegramBot.initialize();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server API running on port ${PORT}`);
});
