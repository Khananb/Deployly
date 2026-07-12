const db = require('./backend/config/db');
async function t() {
    console.log(await db.execute("SELECT COUNT(*) AS totalWebsites FROM websites WHERE user_id = ?", [1]));
    console.log(await db.execute("SELECT COUNT(*) AS activeWebsites FROM websites WHERE user_id = ? AND status = 'running'", [1]));
    console.log(await db.execute("SELECT COUNT(*) AS pendingWebsites FROM websites WHERE user_id = ? AND status IN ('pending', 'deploying')", [1]));
    console.log(await db.execute("SELECT COUNT(*) AS failedWebsites FROM websites WHERE user_id = ? AND status = 'failed'", [1]));
}
t();
