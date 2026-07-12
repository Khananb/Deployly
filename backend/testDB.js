const db = require("./config/db");
async function check() {
    try {
        const [rows] = await db.query("SELECT 1");
        console.log("DB connected");
        process.exit(0);
    } catch(err) {
        console.error("DB error:", err.message);
        process.exit(1);
    }
}
check();
