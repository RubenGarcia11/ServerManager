# 🖥️ ServerManager - Panel de Control de Servidores Docker

<p align="center">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"/>
</p>

**ServerManager** es una aplicación completa para gestionar servidores Docker desde un dashboard web moderno y desde un bot de Telegram. Permite controlar contenedores SSH, FTP y Web con funcionalidades avanzadas como terminal remota, gestor de archivos, monitoreo de recursos y más.

---

## 📋 Tabla de Contenidos

1. [Arquitectura del Sistema](#-arquitectura-del-sistema)
2. [Requisitos Previos](#-requisitos-previos)
3. [Instalación y Configuración](#-instalación-y-configuración)
4. [Servicios Backend](#-servicios-backend)
   - [Docker Control Service](#docker-control-service)
   - [SSH Client Service](#ssh-client-service)
   - [FTP Service](#ftp-service)
   - [Web Service](#web-service)
   - [Telegram Bot Service](#telegram-bot-service)
   - [Ngrok Service](#ngrok-service)
5. [API REST Endpoints](#-api-rest-endpoints)
6. [Frontend Dashboard](#-frontend-dashboard)
   - [Terminal SSH](#terminal-ssh)
   - [Gestor de Archivos FTP](#gestor-de-archivos-ftp)
   - [Control Web](#control-web)
   - [Panel de Bot Telegram](#panel-de-bot-telegram)
7. [Bot de Telegram](#-bot-de-telegram)
8. [Configuración Docker](#-configuración-docker)
9. [Estructura del Proyecto](#-estructura-del-proyecto)

---

## 🏗️ Arquitectura del Sistema

El sistema está compuesto por los siguientes componentes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE                                        │
├─────────────────────┬───────────────────────────────────────────────────────┤
│   Dashboard Web     │              Bot Telegram                             │
│   (React + Vite)    │         (node-telegram-bot-api)                       │
│   Puerto: 80        │                                                       │
└─────────┬───────────┴──────────────────────────┬────────────────────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVIDOR API (Node.js/Express)                      │
│                              Puerto: 3000                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Docker       │  │ SSH Client   │  │ FTP Service  │  │ Web Service  │    │
│  │ Control      │  │              │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                                        │
│  │ Telegram Bot │  │ Ngrok        │                                        │
│  │ Service      │  │ Service      │                                        │
│  └──────────────┘  └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTENEDORES TARGET                                  │
├──────────────────────┬────────────────────┬─────────────────────────────────┤
│   SSH Target         │   FTP Target       │   Web Target                    │
│   (Ubuntu + OpenSSH) │   (vsftpd)         │   (Nginx + OpenSSH)             │
│   Puerto: 2222       │   Puertos: 2121,   │   Puertos: 8080, 2224           │
│                      │   21000-21010      │                                 │
└──────────────────────┴────────────────────┴─────────────────────────────────┘
```

---

## 📋 Requisitos Previos

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Node.js** >= 18 (solo para desarrollo local)
- **Token de Bot de Telegram** (obtener de [@BotFather](https://t.me/BotFather))
- **Token de Ngrok** (opcional, para acceso público)

---

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd ServerManager
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
# Token del Bot de Telegram (obtener de @BotFather)
TELEGRAM_BOT_TOKEN=tu_token_aqui

# Token de Ngrok (para acceso público a servidores web)
NGROK_AUTHTOKEN=tu_token_ngrok
```

### 3. Iniciar con Docker Compose

```bash
docker-compose up -d --build
```

### 4. Acceder al Dashboard

Abrir en el navegador: **http://localhost**

---

## ⚙️ Servicios Backend

El backend está compuesto por múltiples servicios especializados ubicados en `server/services/`.

### Docker Control Service

**Archivo:** `server/services/dockerControl.js`

Este servicio proporciona control completo sobre contenedores Docker utilizando la librería `dockerode`.

#### Conexión con Docker

```javascript
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const getContainer = (name) => docker.getContainer(name);
```

#### Listar Contenedores

Obtiene todos los contenedores target (excluyendo los del dashboard):

```javascript
const listContainers = async () => {
    const containers = await docker.listContainers({ all: true });
    // Filtra solo contenedores target (excluye dashboard-server y dashboard-client)
    return containers.filter(c => c.Names.some(n =>
        n.includes('target') && !n.includes('dashboard')
    ));
};
```

#### Iniciar/Detener Contenedores

```javascript
const startContainer = async (name) => {
    const container = getContainer(name);
    await container.start();
    return { status: 'started', name };
};

const stopContainer = async (name) => {
    const container = getContainer(name);
    await container.stop();
    return { status: 'stopped', name };
};
```

#### Inspección Detallada de Contenedores

Obtiene información completa incluyendo límites de recursos:

```javascript
const inspectContainer = async (name) => {
    const container = getContainer(name);
    const info = await container.inspect();
    return {
        id: info.Id,
        name: info.Name.replace('/', ''),
        state: info.State.Status,
        created: info.Created,
        image: info.Config.Image,
        resources: {
            cpuShares: info.HostConfig.CpuShares || 0,
            cpuQuota: info.HostConfig.CpuQuota || 0,
            cpuPeriod: info.HostConfig.CpuPeriod || 100000,
            memoryLimit: info.HostConfig.Memory || 0,
            memoryReservation: info.HostConfig.MemoryReservation || 0,
            memorySwap: info.HostConfig.MemorySwap || 0,
        },
        restartPolicy: info.HostConfig.RestartPolicy,
        ports: info.HostConfig.PortBindings,
        mounts: info.Mounts
    };
};
```

#### Actualizar Recursos de Contenedor

Permite modificar límites de CPU y memoria en tiempo real:

```javascript
const updateContainerResources = async (name, resources) => {
    const container = getContainer(name);
    const updateConfig = {};

    // CPU limit usando NanoCpus (1 CPU = 1e9 nanocpus)
    if (resources.cpuLimit !== undefined) {
        updateConfig.NanoCpus = Math.floor(resources.cpuLimit * 1e9);
    }

    // Memory limit (en bytes)
    if (resources.memoryLimit !== undefined) {
        updateConfig.Memory = resources.memoryLimit * 1024 * 1024; // MB a bytes
    }

    // Memory reservation
    if (resources.memoryReservation !== undefined) {
        updateConfig.MemoryReservation = resources.memoryReservation * 1024 * 1024;
    }

    await container.update(updateConfig);
    return { success: true, name, updatedResources: resources };
};
```

#### Crear Nuevos Contenedores

Crea contenedores dinámicamente basándose en imágenes existentes:

```javascript
const createContainer = async (options) => {
    const { name, type, cpuLimit, memoryLimit } = options;

    const imageMap = {
        ssh: 'servermanager-ssh-target',
        ftp: 'servermanager-ftp-target',
        web: 'servermanager-web-target'
    };

    const image = imageMap[type];
    if (!image) throw new Error(`Invalid server type: ${type}`);

    const baseName = name.replace(/-target$/, '').replace(/-ssh$/, '')
        .replace(/-ftp$/, '').replace(/-web$/, '');
    const containerName = `${baseName}-${type}-target`;

    const containerConfig = {
        Image: image,
        name: containerName,
        Hostname: containerName,
        HostConfig: {
            RestartPolicy: { Name: 'unless-stopped' },
            NetworkMode: 'servermanager_default'
        }
    };

    // Configurar límites de recursos
    if (cpuLimit) {
        containerConfig.HostConfig.NanoCpus = Math.floor(cpuLimit * 1e9);
    }
    if (memoryLimit) {
        containerConfig.HostConfig.Memory = memoryLimit * 1024 * 1024;
    }

    // Configurar puertos según el tipo
    if (type === 'ssh') {
        containerConfig.ExposedPorts = { '22/tcp': {} };
        containerConfig.HostConfig.PortBindings = { '22/tcp': [{ HostPort: '' }] };
    } else if (type === 'ftp') {
        containerConfig.ExposedPorts = { '21/tcp': {}, '22/tcp': {} };
        containerConfig.HostConfig.PortBindings = { 
            '21/tcp': [{ HostPort: '' }], 
            '22/tcp': [{ HostPort: '' }] 
        };
    } else if (type === 'web') {
        containerConfig.ExposedPorts = { '80/tcp': {}, '22/tcp': {} };
        containerConfig.HostConfig.PortBindings = { 
            '80/tcp': [{ HostPort: '' }], 
            '22/tcp': [{ HostPort: '' }] 
        };
    }

    const container = await docker.createContainer(containerConfig);
    await container.start();
    return { success: true, name: containerName, type, id: container.id };
};
```

#### Eliminar Contenedores

```javascript
const deleteContainer = async (name) => {
    const container = getContainer(name);
    try { await container.stop(); } catch (e) { }
    await container.remove();
    return { success: true, name };
};
```

---

### SSH Client Service

**Archivo:** `server/services/sshClient.js`

Proporciona ejecución de comandos remotos vía SSH usando la librería `ssh2`.

#### Ejecutar Comandos SSH

```javascript
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
```

#### Obtener Estadísticas del Sistema

Obtiene métricas de CPU, memoria y disco de un servidor remoto:

```javascript
const getSystemStats = async (host, port, username, password) => {
    try {
        // Comando para obtener uso de CPU
        const cpucmd = "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'";
        
        // Comando para obtener uso de memoria
        const memcmd = "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2 }'";
        
        // Comando para obtener uso de disco
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
```

---

### FTP Service

**Archivo:** `server/services/ftpService.js`

Proporciona operaciones completas de FTP usando la librería `basic-ftp`.

#### Conexión FTP

```javascript
const ftp = require("basic-ftp");
const fs = require('fs');
const path = require('path');

const connect = async (host, port, user, password) => {
    const client = new ftp.Client();
    try {
        await client.access({
            host,
            port,
            user,
            password,
            secure: false
        });
        return client;
    } catch (err) {
        client.close();
        throw err;
    }
};
```

#### Listar Archivos

```javascript
const listFiles = async (host, port, user, password, remotePath = "/") => {
    const client = await connect(host, port, user, password);
    try {
        const list = await client.list(remotePath);
        return list;
    } finally {
        client.close();
    }
};
```

#### Subir Archivos

```javascript
const uploadFile = async (host, port, user, password, localPath, remotePath) => {
    const client = await connect(host, port, user, password);
    try {
        await client.uploadFrom(localPath, remotePath);
    } finally {
        client.close();
    }
};
```

#### Descargar Archivos

```javascript
const downloadFile = async (host, port, user, password, remotePath) => {
    const client = await connect(host, port, user, password);
    const localPath = `/tmp/ftp_download_${Date.now()}.txt`;
    try {
        await client.downloadTo(localPath, remotePath);
        const content = fs.readFileSync(localPath, 'utf-8');
        fs.unlinkSync(localPath); // cleanup
        return content;
    } finally {
        client.close();
    }
};

// Descargar archivos binarios
const downloadToPath = async (host, port, user, password, remotePath) => {
    const client = await connect(host, port, user, password);
    const ext = path.extname(remotePath) || '.bin';
    const localPath = `/tmp/ftp_download_${Date.now()}${ext}`;
    try {
        await client.downloadTo(localPath, remotePath);
        return localPath;
    } finally {
        client.close();
    }
};
```

#### Guardar Contenido de Archivo

```javascript
const saveFile = async (host, port, user, password, remotePath, content) => {
    const client = await connect(host, port, user, password);
    const localPath = `/tmp/ftp_save_${Date.now()}.txt`;
    try {
        fs.writeFileSync(localPath, content, 'utf-8');
        await client.uploadFrom(localPath, remotePath);
        fs.unlinkSync(localPath); // cleanup
    } finally {
        client.close();
    }
};
```

#### Renombrar y Eliminar Archivos

```javascript
const renameFile = async (host, port, user, password, oldPath, newPath) => {
    const client = await connect(host, port, user, password);
    try {
        await client.rename(oldPath, newPath);
    } finally {
        client.close();
    }
};

const deleteFile = async (host, port, user, password, remotePath) => {
    const client = await connect(host, port, user, password);
    try {
        await client.remove(remotePath);
    } finally {
        client.close();
    }
};
```

#### Crear Directorios

```javascript
const createDirectory = async (host, port, user, password, remotePath) => {
    const client = await connect(host, port, user, password);
    try {
        await client.ensureDir(remotePath);
    } finally {
        client.close();
    }
};
```

---

### Web Service

**Archivo:** `server/services/webService.js`

Proporciona funcionalidades específicas para servidores web Nginx.

#### Estado de Nginx

```javascript
const { executeCommand } = require('./sshClient');

const getNginxStatus = async (host, port, user, pass) => {
    try {
        const output = await executeCommand(host, port, user, pass, "service nginx status");
        return { 
            status: output.includes("is running") ? "running" : "stopped", 
            raw: output 
        };
    } catch (e) {
        return { status: "error", error: e.message };
    }
};
```

#### Logs de Acceso

```javascript
const getAccessLogs = async (host, port, user, pass, lines = 20) => {
    try {
        const output = await executeCommand(
            host, port, user, pass, 
            `tail -n ${lines} /var/log/nginx/access.log`
        );
        return output;
    } catch (e) {
        return "Error fetching logs: " + e.message;
    }
};
```

---

### Telegram Bot Service

**Archivo:** `server/services/telegramBot.js`

Proporciona control completo de servidores a través de Telegram.

#### Sistema de Logging

El bot registra todas las conversaciones para visualizarlas en el dashboard:

```javascript
// Almacenamiento de logs en memoria
let chatLogs = [];
const MAX_LOGS = 1000;

/**
 * Añade una entrada de log para visualización en dashboard
 */
const addLog = (msg, responseText, isCommand = false) => {
    if (!msg || !msg.from) return;
    const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        userId: msg.from.id,
        userName: msg.from.username || null,
        firstName: msg.from.first_name || 'Unknown',
        lastName: msg.from.last_name || '',
        chatId: msg.chat.id,
        chatType: msg.chat.type,
        message: msg.text || '[media]',
        isCommand,
        response: responseText
    };
    chatLogs.unshift(log);
    if (chatLogs.length > MAX_LOGS) chatLogs.pop();
};
```

#### Información del Bot

```javascript
const getBotInfo = async () => {
    if (!bot) return { active: false, username: null };
    try {
        const me = await bot.getMe();
        return { 
            active: true, 
            username: me.username,
            firstName: me.first_name,
            id: me.id
        };
    } catch (e) {
        return { active: true, username: 'Bot', error: e.message };
    }
};
```

#### Cache de Servidores

El bot mantiene un caché de servidores para acceso rápido por número:

```javascript
let serverCache = [];

const refreshServerCache = async () => {
    const containers = await dockerService.listContainers();
    serverCache = containers.map((c, index) => ({
        number: index + 1,
        id: c.Id,
        name: c.Names[0].replace('/', ''),
        state: c.State,
        status: c.Status,
        type: c.Names[0].includes('ssh') ? 'ssh' :
            c.Names[0].includes('ftp') ? 'ftp' : 'web'
    }));
    return serverCache;
};
```

#### Formateo de Estadísticas con Barras de Progreso

```javascript
const createProgressBar = (percentage) => {
    const total = 10;
    const filled = Math.round((percentage / 100) * total);
    const empty = total - filled;
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    return `${filledBar}${emptyBar}`;
};

const formatStats = (stats, serverNumber, serverName) => {
    const cpu = parseFloat(stats.cpu) || 0;
    const memory = parseFloat(stats.memory) || 0;
    const disk = parseFloat(stats.disk) || 0;

    const getIndicator = (value) => {
        if (value >= 90) return '🔴';
        if (value >= 70) return '🟠';
        if (value >= 50) return '🟡';
        return '🟢';
    };

    return `
📊 *Estadísticas - Servidor #${serverNumber}*
\`${serverName}\`

💻 *CPU*
${getIndicator(cpu)} ${createProgressBar(cpu)} *${cpu.toFixed(1)}%*

🧠 *Memoria RAM*
${getIndicator(memory)} ${createProgressBar(memory)} *${memory.toFixed(1)}%*

💾 *Disco*
${getIndicator(disk)} ${createProgressBar(disk)} *${disk.toFixed(1)}%*
    `;
};
```

#### Comandos Principales

**Comando /servers - Lista de servidores:**
```javascript
bot.onText(/\/servers/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const servers = await refreshServerCache();
        const message = formatServerList(servers);

        const inlineKeyboard = servers.map(s => ([{
            text: `${s.state === 'running' ? '🟢' : '🔴'} #${s.number} ${getTypeEmoji(s.type)} ${s.name}`,
            callback_data: `select_${s.number}`
        }]));

        bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
        addLog(msg, `Lista de ${servers.length} servidores`, true);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});
```

**Comando /ssh - Ejecutar comandos remotos:**
```javascript
bot.onText(/\/ssh (\d+)\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const serverNum = parseInt(match[1]);
    const command = match[2].trim();

    try {
        await refreshServerCache();
        const server = serverCache.find(s => s.number === serverNum);

        if (!server) {
            bot.sendMessage(chatId, `❌ Servidor #${serverNum} no encontrado.`);
            return;
        }

        if (server.type !== 'ssh') {
            bot.sendMessage(chatId, `⚠️ El servidor #${serverNum} no es de tipo SSH.`);
            return;
        }

        if (server.state !== 'running') {
            bot.sendMessage(chatId, `⚠️ El servidor no está en ejecución.`);
            return;
        }

        bot.sendMessage(chatId, `🔄 Ejecutando: \`${command}\`...`, { parse_mode: 'Markdown' });

        const output = await sshService.executeCommand(
            server.name, 22, 'root', 'password', command
        );

        const response = `
💻 *Resultado SSH - #${serverNum}*

📝 *Comando:* \`${command}\`

📤 *Salida:*
\`\`\`
${output.substring(0, 3000) || '(sin salida)'}
\`\`\`
        `;

        bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        addLog(msg, `SSH ejecutado: ${command.substring(0, 50)}`, true);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error SSH: ${error.message}`);
        addLog(msg, `Error SSH: ${error.message}`, true);
    }
});
```

**Comando /create - Crear nuevos servidores:**
```javascript
bot.onText(/\/create (\w+)\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const type = match[1].toLowerCase();
    const name = match[2].trim().toLowerCase().replace(/\s+/g, '-');

    if (!['ssh', 'ftp', 'web'].includes(type)) {
        bot.sendMessage(chatId, `❌ Tipo inválido: ${type}\n\nTipos válidos: ssh, ftp, web`);
        return;
    }

    try {
        bot.sendMessage(chatId, `🔄 Creando servidor ${type.toUpperCase()}: *${name}*...`, 
            { parse_mode: 'Markdown' });

        const result = await dockerService.createContainer({
            name: name,
            type: type,
            cpuLimit: 0.5,
            memoryLimit: 256
        });

        await refreshServerCache();

        bot.sendMessage(chatId, `
✅ *Servidor Creado*

${getTypeEmoji(type)} *Tipo:* ${type.toUpperCase()}
📛 *Nombre:* \`${result.name}\`
🆔 *ID:* \`${result.id.substring(0, 12)}\`

Usa /servers para verlo en la lista.
        `, { parse_mode: 'Markdown' });
        addLog(msg, `Servidor creado: ${type}/${name}`, true);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error al crear: ${error.message}`);
    }
});
```

#### API Exports del Bot

```javascript
module.exports = { 
    initialize,
    getLogs: () => chatLogs,
    getBotInfo,
    clearLogs: () => { chatLogs = []; },
    sendMessage: async (chatId, text) => {
        if (bot) {
            await bot.sendMessage(chatId, text);
            return true;
        }
        return false;
    },
    getActiveChats: () => {
        const chats = {};
        chatLogs.forEach(log => {
            if (!chats[log.chatId]) {
                chats[log.chatId] = {
                    chatId: log.chatId,
                    userName: log.userName,
                    firstName: log.firstName,
                    lastName: log.lastName,
                    lastMessage: log.timestamp
                };
            }
        });
        return Object.values(chats);
    }
};
```

---

### Ngrok Service

**Archivo:** `server/services/ngrokService.js`

Proporciona túneles públicos para acceso externo a servidores.

#### Iniciar Túnel

```javascript
const ngrok = require('@ngrok/ngrok');

let activeTunnels = {};

const startTunnel = async (targetHost, targetPort) => {
    const key = `${targetHost}:${targetPort}`;

    // Retornar túnel existente si está activo
    if (activeTunnels[key] && activeTunnels[key].url) {
        return activeTunnels[key];
    }

    const authtoken = process.env.NGROK_AUTHTOKEN;
    if (!authtoken) {
        throw new Error('NGROK_AUTHTOKEN not configured');
    }

    try {
        const listener = await ngrok.forward({
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
```

#### Detener Túneles

```javascript
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
```

---

## 🌐 API REST Endpoints

El servidor Express expone los siguientes endpoints:

### Servidores Docker

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/servers` | Lista todos los servidores (Docker + custom) |
| `POST` | `/api/servers/:name/start` | Inicia un contenedor |
| `POST` | `/api/servers/:name/stop` | Detiene un contenedor |
| `POST` | `/api/servers/:name/restart` | Reinicia un contenedor |
| `GET` | `/api/servers/:name/stats` | Estadísticas del servidor |
| `GET` | `/api/servers/:name/inspect` | Información detallada |
| `PUT` | `/api/servers/:name/resources` | Actualizar recursos (CPU/RAM) |
| `GET` | `/api/servers/:name/logs` | Logs del contenedor |
| `POST` | `/api/servers/docker/create` | Crear nuevo contenedor |
| `DELETE` | `/api/servers/docker/:name` | Eliminar contenedor |

### FTP

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/ftp/list` | Listar archivos |
| `POST` | `/api/ftp/upload` | Subir archivo |
| `POST` | `/api/ftp/download` | Descargar archivo |
| `POST` | `/api/ftp/delete` | Eliminar archivo |
| `POST` | `/api/ftp/read` | Leer contenido de archivo |
| `POST` | `/api/ftp/save` | Guardar contenido |
| `POST` | `/api/ftp/rename` | Renombrar archivo |
| `POST` | `/api/ftp/mkdir` | Crear directorio |
| `POST` | `/api/ftp/preview` | Preview de imagen (base64) |

### Web

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/web/status` | Estado de Nginx |
| `POST` | `/api/web/logs` | Logs de acceso |
| `POST` | `/api/web/ftp-files` | Archivos HTML del FTP |
| `POST` | `/api/web/deploy` | Desplegar HTML a servidor web |

### Bot de Telegram

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/telegram/status` | Estado del bot |
| `GET` | `/api/telegram/logs` | Historial de conversaciones |
| `GET` | `/api/telegram/chats` | Chats activos |
| `POST` | `/api/telegram/send` | Enviar mensaje |
| `DELETE` | `/api/telegram/logs` | Limpiar logs |

---

## 🎨 Frontend Dashboard

El frontend está construido con React + Vite y utiliza Tailwind CSS para estilos.

### Terminal SSH

**Archivo:** `client/src/components/Terminal.jsx`

Proporciona una terminal interactiva usando xterm.js y Socket.IO:

```jsx
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';

export default function TerminalComponent({ serverName }) {
    const terminalRef = useRef(null);
    const terminalContainerRef = useRef(null);
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
        term.open(terminalContainerRef.current);

        const socket = io();
        socketRef.current = socket;

        socket.on('connect', () => {
            term.write(`\r\nConectando a ${serverName}...\r\n`);

            socket.emit('start-terminal', {
                host: serverName,
                port: 22,
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

        // ResizeObserver para ajustar terminal
        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        resizeObserver.observe(terminalContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            socket.disconnect();
            term.dispose();
        };
    }, [serverName]);

    return (
        <div ref={terminalContainerRef} className="h-full w-full" />
    );
}
```

### Gestor de Archivos FTP

**Archivo:** `client/src/components/FileManager.jsx`

Editor de archivos con soporte para:
- Navegación de directorios
- Subida y descarga de archivos
- Edición de archivos de texto
- Previsualización de imágenes
- Renombrar y eliminar archivos
- Crear carpetas

```jsx
export default function FileManager({ serverName }) {
    const [files, setFiles] = useState([]);
    const [path, setPath] = useState('/archivos');
    const [editingFile, setEditingFile] = useState(null);
    const [fileContent, setFileContent] = useState('');

    const ftpCredentials = {
        host: serverName,
        port: 21,
        user: 'ftpuser',
        password: 'ftp123'
    };

    const fetchFiles = async () => {
        const res = await axios.post('/api/ftp/list', {
            ...ftpCredentials,
            path
        });
        setFiles(res.data);
    };

    const handleEditFile = async (filename) => {
        const filePath = `${path === '/' ? '' : path}/${filename}`;
        const res = await axios.post('/api/ftp/read', {
            ...ftpCredentials,
            path: filePath
        });
        setFileContent(res.data.content);
        setEditingFile({ name: filename, path: filePath });
    };

    const handleSaveFile = async () => {
        await axios.post('/api/ftp/save', {
            ...ftpCredentials,
            path: editingFile.path,
            content: fileContent
        });
        setEditingFile(null);
        fetchFiles();
    };

    // ... más funciones
}
```

### Panel de Bot Telegram

**Archivo:** `client/src/components/TelegramBotPanel.jsx`

Panel completo para monitorear y controlar el bot:

```jsx
export default function TelegramBotPanel() {
    const [botStatus, setBotStatus] = useState({ active: false });
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('');
    const [sendForm, setSendForm] = useState({ chatId: '', message: '' });

    // URL relativa para producción (Docker)
    const API_URL = window.location.port === '5173' ? 'http://localhost:3000' : '';

    const fetchStatus = async () => {
        const res = await axios.get(`${API_URL}/api/telegram/status`);
        setBotStatus(res.data);
    };

    const fetchLogs = async () => {
        const res = await axios.get(`${API_URL}/api/telegram/logs?limit=200`);
        setLogs(res.data);
    };

    // Auto-refresh cada 5 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLogs();
            fetchStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        await axios.post(`${API_URL}/api/telegram/send`, {
            chatId: sendForm.chatId,
            message: sendForm.message
        });
        setSendForm(prev => ({ ...prev, message: '' }));
        fetchLogs();
    };

    // Filtrar logs
    const filteredLogs = logs.filter(log => {
        if (!filter) return true;
        const searchLower = filter.toLowerCase();
        return (
            log.message?.toLowerCase().includes(searchLower) ||
            log.userName?.toLowerCase().includes(searchLower) ||
            log.firstName?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header con estado del bot */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Bot className="w-8 h-8 text-blue-400" />
                    <h1 className="text-2xl font-bold">Bot de Telegram</h1>
                </div>
                <div className={`px-4 py-2 rounded-full ${
                    botStatus.active 
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                }`}>
                    {botStatus.active ? 'Bot Activo' : 'Bot Inactivo'}
                </div>
            </div>

            {/* Tabla de logs */}
            <table className="w-full">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Usuario</th>
                        <th>Mensaje</th>
                        <th>Respuesta</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLogs.map(log => (
                        <tr key={log.id}>
                            <td>{formatTime(log.timestamp)}</td>
                            <td>{log.firstName} @{log.userName}</td>
                            <td>{log.message}</td>
                            <td>{log.response}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Panel de envío de mensajes */}
            <form onSubmit={handleSendMessage}>
                <input 
                    value={sendForm.chatId} 
                    onChange={e => setSendForm(p => ({...p, chatId: e.target.value}))}
                    placeholder="Chat ID"
                />
                <input 
                    value={sendForm.message}
                    onChange={e => setSendForm(p => ({...p, message: e.target.value}))}
                    placeholder="Mensaje"
                />
                <button type="submit">Enviar</button>
            </form>
        </div>
    );
}
```

---

## 🤖 Bot de Telegram

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/start` | Mensaje de bienvenida |
| `/help` | Lista de comandos |
| `/servers` | Lista de servidores |
| `/start <#>` | Iniciar servidor |
| `/stop <#>` | Detener servidor |
| `/stats <#>` | Estadísticas del servidor |
| `/ssh <#> <comando>` | Ejecutar comando SSH |
| `/ftp <#>` | Ver archivos FTP |
| `/download <#>` | Descargar archivo FTP |
| `/web <#>` | Estado del servidor web |
| `/logs <#>` | Logs de acceso web |
| `/create <tipo> <nombre>` | Crear nuevo servidor |
| `/delete <#>` | Eliminar servidor |

### Funcionalidades

- **Botones interactivos**: Navegación con teclados inline
- **Subida de archivos**: Envía fotos/documentos para subirlos por FTP
- **Túneles Ngrok**: Acceso público a servidores web
- **Logs en tiempo real**: Visualización en dashboard

---

## 🐳 Configuración Docker

### docker-compose.yml

```yaml
services:
  # Frontend - React app
  dashboard-client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - dashboard-server
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  # Backend API
  dashboard-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    expose:
      - "3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    env_file:
      - .env
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

  # Servidor SSH Target
  ssh-target:
    build:
      context: ./targets/ssh
    ports:
      - "2222:22"
    container_name: ssh-target
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M

  # Servidor FTP Target
  ftp-target:
    build:
      context: ./targets/ftp
    ports:
      - "2223:22"
      - "2121:21"
      - "21000-21010:21000-21010"
    container_name: ftp-target
    volumes:
      - ftp-data:/home/ftpuser/archivos

  # Servidor Web Target
  web-target:
    build:
      context: ./targets/web
    ports:
      - "2224:22"
      - "8080:80"
    container_name: web-target

volumes:
  server-data:
  ftp-data:

networks:
  default:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

---

## 📁 Estructura del Proyecto

```
ServerManager/
├── client/                      # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddServerModal.jsx
│   │   │   ├── FileManager.jsx      # Gestor FTP
│   │   │   ├── Header.jsx           # Navegación + i18n
│   │   │   ├── ResourcesPanel.jsx   # Control de recursos
│   │   │   ├── ServerCard.jsx
│   │   │   ├── ServerDetail.jsx
│   │   │   ├── ServerList.jsx
│   │   │   ├── StatsView.jsx        # Estadísticas
│   │   │   ├── TelegramBotPanel.jsx # Panel Telegram
│   │   │   ├── Terminal.jsx         # Terminal SSH
│   │   │   └── WebControl.jsx       # Control Web
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── server/                      # Backend Node.js
│   ├── services/
│   │   ├── dockerControl.js     # Control Docker
│   │   ├── ftpService.js        # Operaciones FTP
│   │   ├── ngrokService.js      # Túneles Ngrok
│   │   ├── sshClient.js         # Cliente SSH
│   │   ├── telegramBot.js       # Bot Telegram
│   │   └── webService.js        # Servicios Web
│   ├── index.js                 # API Express
│   ├── Dockerfile
│   └── package.json
│
├── targets/                     # Imágenes Docker target
│   ├── ssh/
│   │   └── Dockerfile
│   ├── ftp/
│   │   └── Dockerfile
│   └── web/
│       ├── Dockerfile
│       └── nginx.conf
│
├── docker-compose.yml
├── .env.example
├── .env
└── README.md
```

---

## 📝 Licencia

Este proyecto fue creado como parte de un ejercicio de gestión de servidores Docker.

---

## 🙋 Autor

Desarrollado por Rubén García.
