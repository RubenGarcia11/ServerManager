const ftp = require("basic-ftp");
const fs = require('fs');
const path = require('path');

const connect = async (host, port, user, password) => {
    const client = new ftp.Client();
    // client.ftp.verbose = true;
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

const listFiles = async (host, port, user, password, remotePath = "/") => {
    const client = await connect(host, port, user, password);
    try {
        const list = await client.list(remotePath);
        return list;
    } finally {
        client.close();
    }
};

const uploadFile = async (host, port, user, password, localPath, remotePath) => {
    const client = await connect(host, port, user, password);
    try {
        await client.uploadFrom(localPath, remotePath);
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

// Download file to a local path and return the path (for binary files)
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

// Rename a file on the FTP server
const renameFile = async (host, port, user, password, oldPath, newPath) => {
    const client = await connect(host, port, user, password);
    try {
        await client.rename(oldPath, newPath);
    } finally {
        client.close();
    }
};

// Create a directory on the FTP server
const createDirectory = async (host, port, user, password, remotePath) => {
    const client = await connect(host, port, user, password);
    try {
        await client.ensureDir(remotePath);
    } finally {
        client.close();
    }
};

module.exports = { listFiles, uploadFile, deleteFile, downloadFile, saveFile, downloadToPath, renameFile, createDirectory };

