const { exec } = require('child_process');

function execPromise(command, options = {}) {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}

/**
 * Stop a PM2 process
 */
async function stopProcess(processName) {
    const { error, stdout, stderr } = await execPromise(`pm2 stop ${processName}`);
    return { success: !error, stdout, stderr };
}

/**
 * Delete a PM2 process
 */
async function deleteProcess(processName) {
    const { error, stdout, stderr } = await execPromise(`pm2 delete ${processName}`);
    return { success: !error, stdout, stderr };
}

/**
 * Restart a PM2 process
 */
async function restartProcess(processName) {
    const { error, stdout, stderr } = await execPromise(`pm2 restart ${processName} --update-env`);
    return { success: !error, stdout, stderr };
}

module.exports = {
    execPromise,
    stopProcess,
    deleteProcess,
    restartProcess
};
