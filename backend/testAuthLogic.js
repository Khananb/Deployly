const assert = require('assert');
const authController = require('./controllers/authController');
const authService = require('./services/authService');
const authMiddleware = require('./middleware/authMiddleware');
const db = require('./config/db');
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const mockResponse = () => {
    const res = {};
    res.status = function(code) { this.statusCode = code; return this; };
    res.json = function(data) { console.log("JSON CALLED WITH", data); this.data = data; return this; };
    return res;
};

let usersTable = [];
let insertIdCounter = 1;

db.execute = async (query, params) => {
    console.log("DB QUERY:", query, params);
    if (query.includes("SELECT * FROM users WHERE email")) {
        const user = usersTable.find(u => u.email === params[0]);
        return user ? [[user]] : [[], null];
    }
    if (query.includes("INSERT INTO users")) {
        const user = { id: insertIdCounter++, name: params[0], email: params[1], password: params[2] };
        usersTable.push(user);
        return [{ insertId: user.id }, null];
    }
    return [[], null];
};

async function runTests() {
    console.log("Starting tests...");
    const reqRegister = {
        body: { name: 'Test User', email: 'UPPERCASE@EXAMPLE.COM', password: 'Password123' }
    };
    const resRegister = mockResponse();
    console.log("Calling register...");
    await authController.register(reqRegister, resRegister, (err) => { 
        console.error("Register Error:", err); 
    });
    console.log("After calling register.");
    console.log("resRegister.data:", resRegister.data);
}
runTests();
