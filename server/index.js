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

// --- Custom Servers Storage ---
const fs = require('fs');
const CUSTOM_SERVERS_FILE = '/tmp/custom_servers.json';

const loadCustomServers = () => {
  try {
    if (fs.existsSync(CUSTOM_SERVERS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_SERVERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading custom servers:', e);
  }
  return [];
};

const saveCustomServers = (servers) => {
  fs.writeFileSync(CUSTOM_SERVERS_FILE, JSON.stringify(servers, null, 2));
};

// --- API Endpoints ---

// Add custom server
app.post('/api/servers/custom', (req, res) => {
  try {
    const { name, type, host, port, user, password } = req.body;
    if (!name || !type || !host || !user || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const servers = loadCustomServers();
    const newServer = {
      id: `custom-${Date.now()}`,
      name,
      type,
      host,
      port: port || (type === 'ssh' ? 22 : type === 'ftp' ? 21 : 80),
      user,
      password,
      isCustom: true,
      state: 'unknown',
      status: 'Custom Server'
    };
    servers.push(newServer);
    saveCustomServers(servers);
    res.json(newServer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete custom server
app.delete('/api/servers/custom/:id', (req, res) => {
  try {
    let servers = loadCustomServers();
    servers = servers.filter(s => s.id !== req.params.id);
    saveCustomServers(servers);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Docker Container Control + Custom Servers
app.get('/api/servers', async (req, res) => {
  try {
    const containers = await dockerService.listContainers();
    // Enrich with Type based on name
    const dockerServers = containers.map(c => ({
      id: c.Id,
      name: c.Names[0].replace('/', ''),
      state: c.State,
      status: c.Status,
      type: c.Names[0].includes('ssh') ? 'ssh' : c.Names[0].includes('ftp') ? 'ftp' : 'web',
      isCustom: false
    }));

    // Add custom servers
    const customServers = loadCustomServers();
    res.json([...dockerServers, ...customServers]);
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

// Container inspection - get detailed info and resources
app.get('/api/servers/:name/inspect', async (req, res) => {
  try {
    const info = await dockerService.inspectContainer(req.params.name);
    res.json(info);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update container resources
app.put('/api/servers/:name/resources', async (req, res) => {
  try {
    const { cpuLimit, memoryLimit, memoryReservation } = req.body;
    const result = await dockerService.updateContainerResources(req.params.name, {
      cpuLimit, memoryLimit, memoryReservation
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Restart container
app.post('/api/servers/:name/restart', async (req, res) => {
  try {
    const result = await dockerService.restartContainer(req.params.name);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get container logs
app.get('/api/servers/:name/logs', async (req, res) => {
  try {
    const logs = await dockerService.getContainerLogs(req.params.name, req.query.tail || 100);
    res.json({ logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create new Docker container
app.post('/api/servers/docker/create', async (req, res) => {
  try {
    const { name, type, cpuLimit, memoryLimit } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    const result = await dockerService.createContainer({ name, type, cpuLimit, memoryLimit });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete Docker container
app.delete('/api/servers/docker/:name', async (req, res) => {
  try {
    const result = await dockerService.deleteContainer(req.params.name);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// FTP Create Directory
app.post('/api/ftp/mkdir', async (req, res) => {
  const { host, port, user, password, path } = req.body;
  try {
    await ftpService.createDirectory(host, port || 21, user, password, path);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Web - List HTML files from FTP server for deployment
app.post('/api/web/ftp-files', async (req, res) => {
  const { ftpHost } = req.body;
  try {
    // List files from FTP root directory recursively looking for HTML files
    const files = await ftpService.listFiles(ftpHost, 21, 'ftpuser', 'ftp123', '/archivos');
    const htmlFiles = files.filter(f => !f.isDirectory && f.name.endsWith('.html'));
    res.json(htmlFiles);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Web - Deploy HTML from FTP to web server
app.post('/api/web/deploy', async (req, res) => {
  const { ftpHost, webHost, filePath, fileName } = req.body;
  try {
    // Download file from FTP
    const localPath = await ftpService.downloadToPath(ftpHost, 21, 'ftpuser', 'ftp123', filePath);

    // Copy to web server via SSH/SCP
    const fs = require('fs');
    const fileContent = fs.readFileSync(localPath, 'utf-8');

    // Use SSH to write the file to nginx html folder
    await sshService.executeCommand(webHost, 22, 'root', 'password',
      `cat > /usr/share/nginx/html/index.html << 'HTMLEOF'
${fileContent}
HTMLEOF`);

    fs.unlinkSync(localPath); // cleanup
    res.json({ success: true, message: `Deployed ${fileName} to web server` });
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
