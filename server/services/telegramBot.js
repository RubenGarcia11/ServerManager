const TelegramBot = require('node-telegram-bot-api');
const dockerService = require('./dockerControl');
const sshService = require('./sshClient');
const ftpService = require('./ftpService');
const webService = require('./webService');
const ngrokService = require('./ngrokService');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

let bot = null;
let serverCache = []; // Cache for numbered server list
let userSessions = {}; // Track user sessions for interactive mode

/**
 * Refresh the server cache and return the list
 */
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

/**
 * Get server by number or name
 */
const getServer = (input) => {
    const num = parseInt(input);
    if (!isNaN(num)) {
        return serverCache.find(s => s.number === num);
    }
    return serverCache.find(s => s.name === input || s.name.includes(input));
};

/**
 * Get type emoji
 */
const getTypeEmoji = (type) => {
    switch (type) {
        case 'ssh': return '🔐';
        case 'ftp': return '📁';
        case 'web': return '🌐';
        default: return '🖥️';
    }
};

/**
 * Create a visual progress bar
 */
const createProgressBar = (percentage) => {
    const total = 10;
    const filled = Math.round((percentage / 100) * total);
    const empty = total - filled;
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    return `${filledBar}${emptyBar}`;
};

/**
 * Format stats with progress bars and percentages
 */
const formatStats = (stats, serverNumber, serverName) => {
    const cpu = parseFloat(stats.cpu) || 0;
    const memory = parseFloat(stats.memory) || 0;
    const disk = parseFloat(stats.disk) || 0;

    const cpuBar = createProgressBar(cpu);
    const memBar = createProgressBar(memory);
    const diskBar = createProgressBar(disk);

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
${getIndicator(cpu)} ${cpuBar} *${cpu.toFixed(1)}%*

🧠 *Memoria RAM*
${getIndicator(memory)} ${memBar} *${memory.toFixed(1)}%*

💾 *Disco*
${getIndicator(disk)} ${diskBar} *${disk.toFixed(1)}%*
    `;
};

/**
 * Create inline keyboard for server actions based on type
 */
const createServerKeyboard = (server) => {
    const num = server.number;
    const baseButtons = [
        [
            { text: '▶️ Iniciar', callback_data: `start_${num}` },
            { text: '⏹️ Detener', callback_data: `stop_${num}` }
        ],
        [
            { text: '📊 Stats', callback_data: `stats_${num}` },
            { text: '🔄 Actualizar', callback_data: `status_${num}` }
        ]
    ];

    // Add type-specific buttons
    if (server.type === 'ssh') {
        baseButtons.push([
            { text: '💻 Ejecutar Comando', callback_data: `ssh_${num}` }
        ]);
    } else if (server.type === 'ftp') {
        baseButtons.push([
            { text: '📂 Ver Archivos', callback_data: `ftplist_${num}` },
            { text: '📤 Subir Archivo', callback_data: `ftpupload_${num}` }
        ]);
    } else if (server.type === 'web') {
        baseButtons.push([
            { text: '🌐 Estado Nginx', callback_data: `webstatus_${num}` },
            { text: '📋 Ver Logs', callback_data: `weblogs_${num}` }
        ]);
    }

    return { inline_keyboard: baseButtons };
};

/**
 * Create main menu keyboard
 */
const createMainKeyboard = () => ({
    keyboard: [
        ['📋 Lista de Servidores'],
        ['❓ Ayuda']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
});

/**
 * Format server list message
 */
const formatServerList = (servers) => {
    if (servers.length === 0) {
        return '❌ No se encontraron servidores.';
    }

    let message = '🖥️ *Servidores Disponibles*\n\n';

    for (const server of servers) {
        const statusIcon = server.state === 'running' ? '🟢' : '🔴';
        const typeEmoji = getTypeEmoji(server.type);

        message += `*${server.number}.* ${statusIcon} ${typeEmoji} \`${server.name}\`\n`;
    }

    message += '\n_Toca un servidor para ver opciones_';

    return message;
};

/**
 * Format server status message
 */
const formatServerStatus = (server) => {
    const statusIcon = server.state === 'running' ? '🟢' : '🔴';
    const typeEmoji = getTypeEmoji(server.type);

    let typeLabel = '';
    switch (server.type) {
        case 'ssh': typeLabel = 'SSH - Terminal remoto'; break;
        case 'ftp': typeLabel = 'FTP - Archivos'; break;
        case 'web': typeLabel = 'Web - Servidor HTTP'; break;
    }

    return `
${statusIcon} *Servidor #${server.number}*

${typeEmoji} *Tipo:* ${typeLabel}
📛 *Nombre:* \`${server.name}\`
📊 *Estado:* ${server.state}
⏱️ *Status:* ${server.status}
  `;
};

/**
 * Download file from Telegram
 */
const downloadTelegramFile = async (fileId, destPath) => {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destPath);
        https.get(fileUrl, (response) => {
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve(destPath);
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
};

/**
 * Initialize the Telegram Bot
 */
const initialize = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.log('⚠️  TELEGRAM_BOT_TOKEN not set, Telegram bot disabled');
        return;
    }

    bot = new TelegramBot(token, { polling: true });

    console.log('🤖 Telegram Bot initialized and polling...');

    // /start command - Welcome with main menu
    bot.onText(/\/start$/, async (msg) => {
        const chatId = msg.chat.id;
        await refreshServerCache();

        const welcomeMessage = `
🖥️ *Server Manager Bot*

¡Bienvenido! Controla tus servidores Docker desde aquí.

*Comandos rápidos:*
• /servers → Ver lista de servidores
• /ssh 1 comando → Ejecutar en SSH
• /ftp 2 → Gestionar archivos FTP
• /web 3 → Ver servidor web

O usa los botones del menú 👇
    `;

        bot.sendMessage(chatId, welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: createMainKeyboard()
        });
    });

    // /help command
    bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        const helpMessage = `
📋 *Comandos Disponibles*

*Control de Servidores:*
🔹 /servers → Lista de servidores
🔹 /start <#> → Iniciar servidor
🔹 /stop <#> → Detener servidor
🔹 /stats <#> → Ver estadísticas

*SSH (Servidor tipo SSH):*
🔹 /ssh <#> <comando> → Ejecutar comando
   _Ejemplo:_ \`/ssh 1 ls -la\`
   _Ejemplo:_ \`/ssh 1 whoami\`

*FTP (Servidor tipo FTP):*
🔹 /ftp <#> → Ver archivos
🔹 Envía una foto/archivo para subirlo

*Web (Servidor tipo Web):*
🔹 /web <#> → Estado de Nginx
🔹 /logs <#> → Ver logs de acceso
    `;
        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Handle text buttons
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text) return;

        if (text === '📋 Lista de Servidores') {
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
        } else if (text === '❓ Ayuda') {
            bot.emit('text', msg, ['/help']);
        }
    });

    // /servers command
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
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    });

    // /ssh <number> <command> - Execute SSH command
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
                bot.sendMessage(chatId, `⚠️ El servidor #${serverNum} no es de tipo SSH.\nUsa un servidor SSH para ejecutar comandos.`);
                return;
            }

            if (server.state !== 'running') {
                bot.sendMessage(chatId, `⚠️ El servidor #${serverNum} no está en ejecución.`, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '▶️ Iniciar', callback_data: `start_${serverNum}` }
                        ]]
                    }
                });
                return;
            }

            bot.sendMessage(chatId, `🔄 Ejecutando: \`${command}\`...`, { parse_mode: 'Markdown' });

            const output = await sshService.executeCommand(server.name, 22, 'root', 'password', command);

            const response = `
💻 *Resultado SSH - #${serverNum}*

📝 *Comando:* \`${command}\`

📤 *Salida:*
\`\`\`
${output.substring(0, 3000) || '(sin salida)'}
\`\`\`
            `;

            bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error SSH: ${error.message}`);
        }
    });

    // /ftp <number> - List FTP files
    bot.onText(/\/ftp (\d+)(?:\s+(.*))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const serverNum = parseInt(match[1]);
        const ftpPath = match[2] || '/';

        try {
            await refreshServerCache();
            const server = serverCache.find(s => s.number === serverNum);

            if (!server) {
                bot.sendMessage(chatId, `❌ Servidor #${serverNum} no encontrado.`);
                return;
            }

            if (server.type !== 'ftp') {
                bot.sendMessage(chatId, `⚠️ El servidor #${serverNum} no es de tipo FTP.`);
                return;
            }

            if (server.state !== 'running') {
                bot.sendMessage(chatId, `⚠️ El servidor #${serverNum} no está en ejecución.`, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '▶️ Iniciar', callback_data: `start_${serverNum}` }
                        ]]
                    }
                });
                return;
            }

            bot.sendMessage(chatId, `🔄 Listando archivos en ${ftpPath}...`);

            // Store session for file upload
            userSessions[chatId] = { ftpServer: serverNum, ftpPath: ftpPath };

            const files = await ftpService.listFiles(server.name, 21, 'ftpuser', 'ftp123', ftpPath);

            let message = `📂 *Archivos FTP - #${serverNum}*\n📁 Ruta: \`${ftpPath}\`\n\n`;

            // Separate directories and files
            const directories = files.filter(f => f.isDirectory);
            const regularFiles = files.filter(f => !f.isDirectory);

            // Store files in session for download
            userSessions[chatId] = {
                ftpServer: serverNum,
                ftpPath: ftpPath,
                serverName: server.name,
                files: regularFiles.map((f, i) => ({ num: i + 1, name: f.name, size: f.size })),
                directories: directories.map(d => d.name)
            };

            if (files.length === 0) {
                message += '_Carpeta vacía_';
            } else {
                // Show directories first
                for (const dir of directories.slice(0, 10)) {
                    message += `📁 \`${dir.name}/\`\n`;
                }

                if (directories.length > 0 && regularFiles.length > 0) {
                    message += '\n';
                }

                // Show files with numbers
                let fileNum = 1;
                for (const file of regularFiles.slice(0, 15)) {
                    const size = `(${(file.size / 1024).toFixed(1)} KB)`;
                    message += `*${fileNum}.* 📄 \`${file.name}\` ${size}\n`;
                    fileNum++;
                }

                if (regularFiles.length > 15) {
                    message += `\n_... y ${regularFiles.length - 15} archivos más_`;
                }
            }

            message += '\n\n📥 `/download <#>` · 📤 Envía archivo';

            // Build navigation buttons
            const inlineKeyboard = [];

            // Add directory buttons (max 6)
            const dirButtons = directories.slice(0, 6).map(d => ({
                text: `📁 ${d.name}`,
                callback_data: `ftpcd_${serverNum}_${ftpPath === '/' ? '' : ftpPath}/${d.name}`
            }));

            // Group directory buttons in rows of 2
            for (let i = 0; i < dirButtons.length; i += 2) {
                inlineKeyboard.push(dirButtons.slice(i, i + 2));
            }

            // Add back button if not at root
            if (ftpPath !== '/' && ftpPath !== '') {
                const parentPath = ftpPath.split('/').slice(0, -1).join('/') || '/';
                inlineKeyboard.push([
                    { text: '⬆️ Subir nivel', callback_data: `ftpcd_${serverNum}_${parentPath}` },
                    { text: '🔄 Actualizar', callback_data: `ftprefresh_${serverNum}_${ftpPath}` }
                ]);
            } else {
                inlineKeyboard.push([
                    { text: '🔄 Actualizar', callback_data: `ftprefresh_${serverNum}_${ftpPath}` }
                ]);
            }

            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: inlineKeyboard }
            });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error FTP: ${error.message}`);
        }
    });

    // /download <number> - Download file from FTP
    bot.onText(/\/download (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const fileNum = parseInt(match[1]);
        const session = userSessions[chatId];

        if (!session || !session.ftpServer || !session.files) {
            bot.sendMessage(chatId, `💡 Primero usa /ftp <#> para ver los archivos disponibles.`);
            return;
        }

        const fileInfo = session.files.find(f => f.num === fileNum);
        if (!fileInfo) {
            bot.sendMessage(chatId, `❌ Archivo #${fileNum} no encontrado.\nUsa /ftp ${session.ftpServer} para ver la lista.`);
            return;
        }

        try {
            await refreshServerCache();
            const server = serverCache.find(s => s.number === session.ftpServer);

            if (!server || server.state !== 'running') {
                bot.sendMessage(chatId, `❌ El servidor FTP no está disponible.`);
                return;
            }

            bot.sendMessage(chatId, `📥 Descargando \`${fileInfo.name}\`...`, { parse_mode: 'Markdown' });

            const remotePath = `${session.ftpPath === '/' ? '' : session.ftpPath}/${fileInfo.name}`;
            const localPath = await ftpService.downloadToPath(server.name, 21, 'ftpuser', 'ftp123', remotePath);

            // Send file to user
            await bot.sendDocument(chatId, localPath, {
                caption: `📁 ${fileInfo.name}\n📊 ${(fileInfo.size / 1024).toFixed(1)} KB`
            });

            // Cleanup
            fs.unlinkSync(localPath);
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error al descargar: ${error.message}`);
        }
    });

    // Handle photo uploads to FTP
    bot.on('photo', async (msg) => {
        const chatId = msg.chat.id;
        const session = userSessions[chatId];

        if (!session || !session.ftpServer) {
            bot.sendMessage(chatId, `💡 Primero usa /ftp <#> para seleccionar un servidor FTP.`);
            return;
        }

        try {
            await refreshServerCache();
            const server = serverCache.find(s => s.number === session.ftpServer);

            if (!server || server.state !== 'running') {
                bot.sendMessage(chatId, `❌ El servidor FTP no está disponible.`);
                return;
            }

            bot.sendMessage(chatId, `📤 Subiendo imagen...`);

            // Get largest photo
            const photo = msg.photo[msg.photo.length - 1];
            const localPath = `/tmp/telegram_upload_${Date.now()}.jpg`;

            await downloadTelegramFile(photo.file_id, localPath);

            const remotePath = `${session.ftpPath}/photo_${Date.now()}.jpg`;
            await ftpService.uploadFile(server.name, 21, 'ftpuser', 'ftp123', localPath, remotePath);

            // Cleanup
            fs.unlinkSync(localPath);

            bot.sendMessage(chatId, `✅ Imagen subida correctamente!\n📁 Ruta: \`${remotePath}\``, { parse_mode: 'Markdown' });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error al subir: ${error.message}`);
        }
    });

    // Handle document uploads to FTP
    bot.on('document', async (msg) => {
        const chatId = msg.chat.id;
        const session = userSessions[chatId];

        if (!session || !session.ftpServer) {
            bot.sendMessage(chatId, `💡 Primero usa /ftp <#> para seleccionar un servidor FTP.`);
            return;
        }

        try {
            await refreshServerCache();
            const server = serverCache.find(s => s.number === session.ftpServer);

            if (!server || server.state !== 'running') {
                bot.sendMessage(chatId, `❌ El servidor FTP no está disponible.`);
                return;
            }

            bot.sendMessage(chatId, `📤 Subiendo archivo: ${msg.document.file_name}...`);

            const localPath = `/tmp/telegram_upload_${Date.now()}_${msg.document.file_name}`;

            await downloadTelegramFile(msg.document.file_id, localPath);

            const remotePath = `${session.ftpPath}/${msg.document.file_name}`;
            await ftpService.uploadFile(server.name, 21, 'ftpuser', 'ftp123', localPath, remotePath);

            // Cleanup
            fs.unlinkSync(localPath);

            bot.sendMessage(chatId, `✅ Archivo subido correctamente!\n📁 Ruta: \`${remotePath}\``, { parse_mode: 'Markdown' });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error al subir: ${error.message}`);
        }
    });

    // /web <number> - Web server status with ngrok tunnel
    bot.onText(/\/web (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const serverNum = parseInt(match[1]);

        try {
            await refreshServerCache();
            const server = serverCache.find(s => s.number === serverNum);

            if (!server) {
                bot.sendMessage(chatId, `❌ Servidor #${serverNum} no encontrado.`);
                return;
            }

            if (server.type !== 'web') {
                bot.sendMessage(chatId, `⚠️ El servidor #${serverNum} no es de tipo Web.`);
                return;
            }

            if (server.state !== 'running') {
                bot.sendMessage(chatId, `⚠️ El servidor #${serverNum} no está en ejecución.`, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '▶️ Iniciar', callback_data: `start_${serverNum}` }
                        ]]
                    }
                });
                return;
            }

            bot.sendMessage(chatId, `🔄 Obteniendo estado del servidor web y creando túnel...`);

            const status = await webService.getNginxStatus(server.name, 22, 'root', 'password');
            const statusIcon = status.status === 'running' ? '🟢' : '🔴';

            // Try to create ngrok tunnel
            let tunnelUrl = null;
            let tunnelMessage = '';

            if (process.env.NGROK_AUTHTOKEN) {
                try {
                    const tunnel = await ngrokService.startTunnel(server.name, 80);
                    tunnelUrl = tunnel.url;
                    tunnelMessage = `\n🌍 *Acceso Público:* [Abrir Web](${tunnelUrl})\n_URL válida mientras el bot esté activo_`;
                } catch (e) {
                    tunnelMessage = `\n⚠️ _No se pudo crear túnel: ${e.message}_`;
                }
            } else {
                tunnelMessage = '\n_Configura NGROK_AUTHTOKEN para acceso público_';
            }

            const message = `
🌐 *Servidor Web - #${serverNum}*

${statusIcon} *Estado Nginx:* ${status.status}

🏠 *Acceso Local:* http://localhost:8080${tunnelMessage}

📋 /logs ${serverNum} para ver logs de acceso
            `;

            const buttons = [
                [{ text: '📋 Ver Logs', callback_data: `weblogs_${serverNum}` }],
                [{ text: '🔄 Actualizar', callback_data: `webstatus_${serverNum}` }]
            ];

            if (tunnelUrl) {
                buttons.unshift([{ text: '🌍 Abrir Web Pública', url: tunnelUrl }]);
                buttons.push([{ text: '🔒 Cerrar Túnel', callback_data: `closetunnel_${serverNum}` }]);
            }

            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
            });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    });

    // /logs <number> - Web server logs
    bot.onText(/\/logs (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const serverNum = parseInt(match[1]);

        try {
            await refreshServerCache();
            const server = serverCache.find(s => s.number === serverNum);

            if (!server || server.type !== 'web') {
                bot.sendMessage(chatId, `❌ Servidor web #${serverNum} no encontrado.`);
                return;
            }

            if (server.state !== 'running') {
                bot.sendMessage(chatId, `⚠️ El servidor no está en ejecución.`);
                return;
            }

            const logs = await webService.getAccessLogs(server.name, 22, 'root', 'password', 15);

            const message = `
📋 *Logs de Acceso - #${serverNum}*

\`\`\`
${logs.substring(0, 3500) || 'Sin logs disponibles'}
\`\`\`
            `;

            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    });

    // Existing commands: /status, /start, /stop, /stats
    bot.onText(/\/status (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const input = match[1].trim();

        try {
            await refreshServerCache();
            const server = getServer(input);

            if (!server) {
                bot.sendMessage(chatId, `❌ Servidor "${input}" no encontrado.`);
                return;
            }

            const message = formatServerStatus(server);
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: createServerKeyboard(server)
            });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    });

    bot.onText(/\/start (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const input = match[1].trim();

        try {
            await refreshServerCache();
            const server = getServer(input);

            if (!server) {
                bot.sendMessage(chatId, `❌ Servidor "${input}" no encontrado.`);
                return;
            }

            bot.sendMessage(chatId, `🔄 Iniciando *#${server.number}*...`, { parse_mode: 'Markdown' });

            await dockerService.startContainer(server.name);
            await refreshServerCache();

            bot.sendMessage(chatId, `✅ Servidor *#${server.number}* iniciado.`, {
                parse_mode: 'Markdown',
                reply_markup: createServerKeyboard(server)
            });
        } catch (error) {
            if (error.message.includes('already started')) {
                bot.sendMessage(chatId, `⚠️ El servidor ya está en ejecución.`);
            } else {
                bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        }
    });

    bot.onText(/\/stop (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const input = match[1].trim();

        try {
            await refreshServerCache();
            const server = getServer(input);

            if (!server) {
                bot.sendMessage(chatId, `❌ Servidor "${input}" no encontrado.`);
                return;
            }

            bot.sendMessage(chatId, `🔄 Deteniendo *#${server.number}*...`, { parse_mode: 'Markdown' });

            await dockerService.stopContainer(server.name);
            await refreshServerCache();

            bot.sendMessage(chatId, `✅ Servidor *#${server.number}* detenido.`, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            if (error.message.includes('not running')) {
                bot.sendMessage(chatId, `⚠️ El servidor ya está detenido.`);
            } else {
                bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        }
    });

    bot.onText(/\/stats (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const input = match[1].trim();

        try {
            await refreshServerCache();
            const server = getServer(input);

            if (!server) {
                bot.sendMessage(chatId, `❌ Servidor "${input}" no encontrado.`);
                return;
            }

            if (server.state !== 'running') {
                bot.sendMessage(chatId, `⚠️ El servidor no está en ejecución.`, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '▶️ Iniciar', callback_data: `start_${server.number}` }
                        ]]
                    }
                });
                return;
            }

            bot.sendMessage(chatId, `🔄 Obteniendo estadísticas...`, { parse_mode: 'Markdown' });

            const stats = await sshService.getSystemStats(server.name, 22, 'root', 'password');
            const message = formatStats(stats, server.number, server.name);

            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: createServerKeyboard(server)
            });
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    });

    // Handle callback queries (inline button clicks)
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        bot.answerCallbackQuery(query.id);

        const [action, numberStr] = data.split('_');
        const serverNumber = parseInt(numberStr);

        await refreshServerCache();
        const server = serverCache.find(s => s.number === serverNumber);

        if (!server) {
            bot.sendMessage(chatId, '❌ Servidor no encontrado. Usa /servers');
            return;
        }

        switch (action) {
            case 'select':
                const message = formatServerStatus(server);
                bot.sendMessage(chatId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: createServerKeyboard(server)
                });
                break;

            case 'start':
                try {
                    bot.sendMessage(chatId, `🔄 Iniciando *#${server.number}*...`, { parse_mode: 'Markdown' });
                    await dockerService.startContainer(server.name);
                    await refreshServerCache();
                    const updatedServer = serverCache.find(s => s.number === serverNumber);
                    bot.sendMessage(chatId, `✅ Servidor *#${server.number}* iniciado`, {
                        parse_mode: 'Markdown',
                        reply_markup: createServerKeyboard(updatedServer)
                    });
                } catch (e) {
                    if (e.message.includes('already started')) {
                        bot.sendMessage(chatId, `⚠️ Ya está en ejecución`);
                    } else {
                        bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                    }
                }
                break;

            case 'stop':
                try {
                    bot.sendMessage(chatId, `🔄 Deteniendo *#${server.number}*...`, { parse_mode: 'Markdown' });
                    await dockerService.stopContainer(server.name);
                    bot.sendMessage(chatId, `✅ Servidor *#${server.number}* detenido`, { parse_mode: 'Markdown' });
                } catch (e) {
                    if (e.message.includes('not running')) {
                        bot.sendMessage(chatId, `⚠️ Ya está detenido`);
                    } else {
                        bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                    }
                }
                break;

            case 'stats':
                if (server.state !== 'running') {
                    bot.sendMessage(chatId, `⚠️ Servidor detenido. Inicia primero.`, {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '▶️ Iniciar', callback_data: `start_${server.number}` }
                            ]]
                        }
                    });
                    return;
                }
                try {
                    const stats = await sshService.getSystemStats(server.name, 22, 'root', 'password');
                    const statsMsg = formatStats(stats, server.number, server.name);
                    bot.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                }
                break;

            case 'status':
                await refreshServerCache();
                const updatedServer = serverCache.find(s => s.number === serverNumber);
                if (updatedServer) {
                    const statusMsg = formatServerStatus(updatedServer);
                    bot.sendMessage(chatId, statusMsg, {
                        parse_mode: 'Markdown',
                        reply_markup: createServerKeyboard(updatedServer)
                    });
                }
                break;

            case 'ssh':
                bot.sendMessage(chatId, `
💻 *Modo SSH - Servidor #${server.number}*

Para ejecutar un comando, usa:
\`/ssh ${server.number} <comando>\`

*Ejemplos:*
\`/ssh ${server.number} ls -la\`
\`/ssh ${server.number} whoami\`
\`/ssh ${server.number} df -h\`
\`/ssh ${server.number} cat /etc/os-release\`
                `, { parse_mode: 'Markdown' });
                break;

            case 'ftplist':
                userSessions[chatId] = { ftpServer: serverNumber, ftpPath: '/' };
                try {
                    const files = await ftpService.listFiles(server.name, 21, 'ftpuser', 'ftp123', '/');
                    let msg = `📂 *Archivos FTP - #${serverNumber}*\n\n`;
                    for (const file of files.slice(0, 15)) {
                        const icon = file.isDirectory ? '📁' : '📄';
                        msg += `${icon} \`${file.name}\`\n`;
                    }
                    msg += '\n_📤 Envía una foto o archivo para subirlo_';
                    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Error FTP: ${e.message}`);
                }
                break;

            case 'ftpupload':
                userSessions[chatId] = { ftpServer: serverNumber, ftpPath: '/' };
                bot.sendMessage(chatId, `
📤 *Modo Subida FTP - #${serverNumber}*

Envía una foto o documento para subirlo al servidor FTP.

Los archivos se guardarán en la carpeta raíz \`/\`
                `, { parse_mode: 'Markdown' });
                break;

            case 'webstatus':
                try {
                    const status = await webService.getNginxStatus(server.name, 22, 'root', 'password');
                    const statusIcon = status.status === 'running' ? '🟢' : '🔴';
                    bot.sendMessage(chatId, `
🌐 *Estado Nginx - #${serverNumber}*

${statusIcon} Estado: *${status.status}*
🔗 URL: http://localhost:8080
                    `, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '📋 Ver Logs', callback_data: `weblogs_${serverNumber}` }
                            ]]
                        }
                    });
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                }
                break;

            case 'weblogs':
                try {
                    const logs = await webService.getAccessLogs(server.name, 22, 'root', 'password', 10);
                    bot.sendMessage(chatId, `
📋 *Logs de Acceso - #${serverNumber}*

\`\`\`
${logs.substring(0, 3000) || 'Sin logs'}
\`\`\`
                    `, { parse_mode: 'Markdown' });
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                }
                break;
        }
    });

    // Handle FTP navigation callbacks separately (they have different format)
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        // Handle FTP navigation: ftpcd_serverNum_path
        if (data.startsWith('ftpcd_')) {
            bot.answerCallbackQuery(query.id);
            const parts = data.split('_');
            const serverNum = parseInt(parts[1]);
            const newPath = parts.slice(2).join('_') || '/';

            try {
                await refreshServerCache();
                const server = serverCache.find(s => s.number === serverNum);

                if (!server || server.state !== 'running') {
                    bot.sendMessage(chatId, `❌ Servidor no disponible.`);
                    return;
                }

                const files = await ftpService.listFiles(server.name, 21, 'ftpuser', 'ftp123', newPath);

                const directories = files.filter(f => f.isDirectory);
                const regularFiles = files.filter(f => !f.isDirectory);

                userSessions[chatId] = {
                    ftpServer: serverNum,
                    ftpPath: newPath,
                    serverName: server.name,
                    files: regularFiles.map((f, i) => ({ num: i + 1, name: f.name, size: f.size })),
                    directories: directories.map(d => d.name)
                };

                let message = `📂 *FTP #${serverNum}*\n📁 \`${newPath}\`\n\n`;

                if (files.length === 0) {
                    message += '_Carpeta vacía_';
                } else {
                    for (const dir of directories.slice(0, 10)) {
                        message += `📁 \`${dir.name}/\`\n`;
                    }
                    if (directories.length > 0 && regularFiles.length > 0) message += '\n';

                    let fileNum = 1;
                    for (const file of regularFiles.slice(0, 15)) {
                        message += `*${fileNum}.* 📄 \`${file.name}\`\n`;
                        fileNum++;
                    }
                }

                message += '\n📥 `/download <#>`';

                const inlineKeyboard = [];
                const dirButtons = directories.slice(0, 6).map(d => ({
                    text: `📁 ${d.name}`,
                    callback_data: `ftpcd_${serverNum}_${newPath === '/' ? '' : newPath}/${d.name}`
                }));
                for (let i = 0; i < dirButtons.length; i += 2) {
                    inlineKeyboard.push(dirButtons.slice(i, i + 2));
                }

                if (newPath !== '/' && newPath !== '') {
                    const parentPath = newPath.split('/').slice(0, -1).join('/') || '/';
                    inlineKeyboard.push([
                        { text: '⬆️ Subir', callback_data: `ftpcd_${serverNum}_${parentPath}` },
                        { text: '🔄', callback_data: `ftprefresh_${serverNum}_${newPath}` }
                    ]);
                } else {
                    inlineKeyboard.push([{ text: '🔄 Actualizar', callback_data: `ftprefresh_${serverNum}_${newPath}` }]);
                }

                bot.sendMessage(chatId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: inlineKeyboard }
                });
            } catch (e) {
                bot.sendMessage(chatId, `❌ Error: ${e.message}`);
            }
        }

        // Handle FTP refresh
        if (data.startsWith('ftprefresh_')) {
            bot.answerCallbackQuery(query.id, { text: '🔄 Actualizando...' });
            const parts = data.split('_');
            const serverNum = parseInt(parts[1]);
            const ftpPath = parts.slice(2).join('_') || '/';

            // Simulate FTP command
            const fakeMsg = { chat: { id: chatId }, text: `/ftp ${serverNum} ${ftpPath}` };
            bot.emit('text', fakeMsg, [serverNum.toString(), ftpPath]);
        }

        // Handle close tunnel
        if (data.startsWith('closetunnel_')) {
            const serverNum = parseInt(data.split('_')[1]);
            try {
                await refreshServerCache();
                const server = serverCache.find(s => s.number === serverNum);

                if (server) {
                    await ngrokService.stopTunnel(server.name, 80);
                    bot.answerCallbackQuery(query.id, { text: '🔒 Túnel cerrado' });
                    bot.sendMessage(chatId, `🔒 *Túnel cerrado*\n\nLa web #${serverNum} ya no está expuesta públicamente.`, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🌐 Reabrir Túnel', callback_data: `webstatus_${serverNum}` }
                            ]]
                        }
                    });
                }
            } catch (e) {
                bot.answerCallbackQuery(query.id, { text: '❌ Error al cerrar túnel' });
            }
        }
    });

    // Handle errors
    bot.on('polling_error', (error) => {
        console.error('Telegram Bot polling error:', error.code);
    });
};

module.exports = { initialize };
