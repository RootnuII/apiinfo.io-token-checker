const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const axios = require('axios');
const crypto = require('crypto');

const GREEN = "\x1b[92m";
const RED = "\x1b[91m";
const RESET = "\x1b[0m";

function generateApiToken() {
    return crypto.randomBytes(7).toString('hex');
}

async function checkApiToken(apiToken) {
    const apiUrl = `https://ipinfo.io/1.1.1.1?token=${apiToken}`;

    try {
        const response = await axios.get(apiUrl);
        return true;
    } catch (error) {
        return false;
    }
}

async function generateAndCheckTokens(workerID) {
    while (true) {
        const apiToken = generateApiToken();
        if (await checkApiToken(apiToken)) {
            process.send({ workerID, apiToken, result: 'valid' });
            break;
        }
    }
}

if (cluster.isMaster) {
    const numWorkers = Math.min(30 * numCPUs, 100); // Set your desired number of workers

    for (let i = 0; i < numWorkers; i++) {
        const worker = cluster.fork();
        worker.on('message', (message) => {
            if (message.result === 'valid') {
                console.log(`${GREEN}Worker ${message.workerID} found a valid key: ${message.apiToken}.${RESET}`);
            }
        });
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    generateAndCheckTokens(cluster.worker.id);
}
