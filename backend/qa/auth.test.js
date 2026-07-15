const { apiRequest } = require('./utils');

async function run() {
    const ts = Date.now();
    const email = `test_qa_${ts}@example.com`;
    const password = `Password123!`;

    // 1. Register User
    const regRes = await apiRequest('auth/register', 'POST', {
        name: `QA User ${ts}`,
        email,
        password
    });
    
    if (!regRes.success) throw new Error("Registration failed");

    // 2. Login User
    const loginRes = await apiRequest('auth/login', 'POST', {
        email,
        password
    });

    if (!loginRes.success || !loginRes.data.token) throw new Error("Login failed or token missing");

    // Pass state to subsequent tests if needed
    return { token: loginRes.data.token };
}

module.exports = { run, name: "Auth" };
