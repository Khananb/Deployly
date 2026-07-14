const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

try {
    admin.initializeApp({
        projectId: "stacks-c30ae"
    });
    console.log("Firebase Admin initialized");
} catch (error) {
    console.error("Firebase admin initialization error", error.stack);
}

module.exports = admin;
