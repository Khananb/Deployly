const db = require("../config/db");

const createDeployment = async (websiteId, filename) => {
    const [result] = await db.execute(
        "INSERT INTO deployments (website_id, filename, status, created_at) VALUES (?, ?, 'uploaded', NOW())",
        [websiteId, filename]
    );
    return result.insertId;
};

const getDeploymentById = async (deploymentId) => {
    const [rows] = await db.execute(
        "SELECT id, website_id, filename, status, created_at FROM deployments WHERE id = ?",
        [deploymentId]
    );
    return rows.length > 0 ? rows[0] : null;
};

const getActiveDeployments = async (websiteId) => {
    const [rows] = await db.execute(
        "SELECT id, status FROM deployments WHERE website_id = ? AND status IN ('deploying', 'running')",
        [websiteId]
    );
    return rows;
};

const updateDeploymentStatus = async (deploymentId, status) => {
    const [result] = await db.execute(
        "UPDATE deployments SET status = ? WHERE id = ?",
        [status, deploymentId]
    );
    return result.affectedRows > 0;
};

const updateDeploymentPaths = async (deploymentId, uploadPath, extractPath) => {
    const [result] = await db.execute(
        "UPDATE deployments SET upload_path = ?, extract_path = ? WHERE id = ?",
        [uploadPath, extractPath, deploymentId]
    );
    return result.affectedRows > 0;
};

const updateDeploymentMetadata = async (deploymentId, projectType, framework) => {
    const [result] = await db.execute(
        "UPDATE deployments SET project_type = ?, framework = ?, detected_at = NOW() WHERE id = ?",
        [projectType, framework, deploymentId]
    );
    return result.affectedRows > 0;
};

const addDeploymentLog = async (deploymentId, action, status, message = "") => {
    const [result] = await db.execute(
        "INSERT INTO deployment_logs (deployment_id, action, status, message, created_at) VALUES (?, ?, ?, ?, NOW())",
        [deploymentId, action, status, message]
    );
    return result.insertId;
};

const getDeployments = async (websiteId) => {
    const [rows] = await db.execute(
        "SELECT id, filename, status, created_at FROM deployments WHERE website_id = ? ORDER BY created_at DESC",
        [websiteId]
    );
    return rows;
};

const getDeploymentLogs = async (deploymentId) => {
    const [rows] = await db.execute(
        "SELECT id, action, status, message, created_at FROM deployment_logs WHERE deployment_id = ? ORDER BY created_at ASC",
        [deploymentId]
    );
    return rows;
};

module.exports = {
    createDeployment,
    getDeploymentById,
    getActiveDeployments,
    updateDeploymentStatus,
    updateDeploymentPaths,
    updateDeploymentMetadata,
    addDeploymentLog,
    getDeployments,
    getDeploymentLogs
};
