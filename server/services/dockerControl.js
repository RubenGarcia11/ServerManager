const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const getContainer = (name) => docker.getContainer(name);

const listContainers = async () => {
    const containers = await docker.listContainers({ all: true });
    // Filter our managed containers (targets or servermanager-*)
    return containers.filter(c => c.Names.some(n =>
        n.includes('target') || n.includes('servermanager') || n.includes('-ssh') || n.includes('-ftp') || n.includes('-web')
    ));
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

// Get detailed container info including resource limits
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

// Update container resources (requires container restart to fully apply some settings)
const updateContainerResources = async (name, resources) => {
    const container = getContainer(name);

    const updateConfig = {};

    // CPU limit using NanoCpus (1 CPU = 1e9 nanocpus)
    if (resources.cpuLimit !== undefined) {
        updateConfig.NanoCpus = Math.floor(resources.cpuLimit * 1e9);
    }

    // Memory limit (in bytes)
    if (resources.memoryLimit !== undefined) {
        updateConfig.Memory = resources.memoryLimit * 1024 * 1024; // MB to bytes
    }

    // Memory reservation
    if (resources.memoryReservation !== undefined) {
        updateConfig.MemoryReservation = resources.memoryReservation * 1024 * 1024;
    }

    await container.update(updateConfig);
    return { success: true, name, updatedResources: resources };
};

// Restart container
const restartContainer = async (name) => {
    const container = getContainer(name);
    await container.restart();
    return { status: 'restarted', name };
};

// Scale container (for Docker Swarm - returns info for standalone)
const getContainerLogs = async (name, tail = 100) => {
    const container = getContainer(name);
    const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: tail,
        timestamps: true
    });
    return logs.toString('utf-8');
};

// Create a new container from existing images
const createContainer = async (options) => {
    const { name, type, cpuLimit, memoryLimit } = options;

    const imageMap = {
        ssh: 'servermanager-ssh-target',
        ftp: 'servermanager-ftp-target',
        web: 'servermanager-web-target'
    };

    const image = imageMap[type];
    if (!image) throw new Error(`Invalid server type: ${type}`);

    // Add -target suffix if not present so it appears in the container list
    const containerName = name.includes('target') ? name : `${name}-target`;

    const containerConfig = {
        Image: image,
        name: containerName,
        Hostname: name,
        HostConfig: { RestartPolicy: { Name: 'unless-stopped' } }
    };

    // Use NanoCpus for CPU limit (1 CPU = 1e9 nanocpus)
    if (cpuLimit) {
        containerConfig.HostConfig.NanoCpus = Math.floor(cpuLimit * 1e9);
    }
    if (memoryLimit) {
        containerConfig.HostConfig.Memory = memoryLimit * 1024 * 1024;
    }

    if (type === 'ssh') {
        containerConfig.ExposedPorts = { '22/tcp': {} };
        containerConfig.HostConfig.PortBindings = { '22/tcp': [{ HostPort: '' }] };
    } else if (type === 'ftp') {
        containerConfig.ExposedPorts = { '21/tcp': {}, '22/tcp': {} };
        containerConfig.HostConfig.PortBindings = { '21/tcp': [{ HostPort: '' }], '22/tcp': [{ HostPort: '' }] };
    } else if (type === 'web') {
        containerConfig.ExposedPorts = { '80/tcp': {}, '22/tcp': {} };
        containerConfig.HostConfig.PortBindings = { '80/tcp': [{ HostPort: '' }], '22/tcp': [{ HostPort: '' }] };
    }

    const container = await docker.createContainer(containerConfig);
    await container.start();
    return { success: true, name: containerName, type, id: container.id };
};

// Delete a container
const deleteContainer = async (name) => {
    const container = getContainer(name);
    try { await container.stop(); } catch (e) { }
    await container.remove();
    return { success: true, name };
};

module.exports = {
    listContainers, startContainer, stopContainer, getStats,
    inspectContainer, updateContainerResources, restartContainer,
    getContainerLogs, createContainer, deleteContainer
};
