const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const getContainer = (name) => docker.getContainer(name);

const listContainers = async () => {
    const containers = await docker.listContainers({ all: true });
    // Filter only our targets
    return containers.filter(c => c.Names.some(n => n.includes('target')));
};

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

const getStats = async (name) => {
    const container = getContainer(name);
    const stats = await container.stats({ stream: false });
    return stats;
};

module.exports = { listContainers, startContainer, stopContainer, getStats };
